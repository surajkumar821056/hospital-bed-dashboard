package com.medresq;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Typed documents preserve the existing UI contract. Writes take the workflow row lock in a transaction. */
@Repository
public class Store {
    final JdbcTemplate jdbc;
    final ObjectMapper json;
    public Store(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    public JdbcTemplate jdbc() { return jdbc; }
    public ObjectMapper json() { return json; }
    public void lock() { jdbc.queryForObject("SELECT id FROM workflow_lock WHERE id=1 FOR UPDATE", Integer.class); }
    public <T> List<T> all(String kind, Class<T> type) {
        return jdbc.query("SELECT payload FROM documents WHERE kind=? ORDER BY id", (rs,n) -> decode(rs.getString(1),type),kind);
    }
    public <T> T get(String kind,String id,Class<T> type) {
        return jdbc.query("SELECT payload FROM documents WHERE kind=? AND id=?", (rs,n)->decode(rs.getString(1),type),kind,id)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Record not found"));
    }
    public boolean exists(String kind,String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM documents WHERE kind=? AND id=?",Integer.class,kind,id)>0;
    }
    public void put(String kind,String id,Object value) {
        var payload=encode(value);
        if(jdbc.update("UPDATE documents SET payload=? WHERE kind=? AND id=?",payload,kind,id)==0)
            jdbc.update("INSERT INTO documents(kind,id,payload) VALUES(?,?,?)",kind,id,payload);
    }
    public String encode(Object value) {
        try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException("Cannot serialize record",e); }
    }
    public <T> T decode(String value,Class<T> type) {
        try { return json.readValue(value,type); } catch(Exception e) { throw new IllegalStateException("Cannot read record",e); }
    }
}
