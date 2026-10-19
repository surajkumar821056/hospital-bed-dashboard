package com.medresq;

import static com.medresq.Models.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final Store store;
    private final boolean demo;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder();
    private final SecureRandom random=new SecureRandom();
    private final Map<String,Challenge> challenges=new ConcurrentHashMap<>();
    private final Map<String,Attempt> attempts=new ConcurrentHashMap<>();
    private record Challenge(String code,long expires,long sent,int failures) {}
    private record Attempt(long start,int count) {}
    public AuthService(Store store,@Value("${app.demo:false}") boolean demo) { this.store=store; this.demo=demo; }
    public void seedAccount(String email,String password,String hospitalId) {
        email=email.toLowerCase(Locale.ROOT).trim();
        if(store.jdbc().queryForObject("SELECT COUNT(*) FROM accounts WHERE email=?",Integer.class,email)==0)
            store.jdbc().update("INSERT INTO accounts(email,password_hash,hospital_id) VALUES(?,?,?)",email,passwords.encode(password),hospitalId);
    }
    @org.springframework.transaction.annotation.Transactional
    public void createAccount(Account input,User user) {
        HealthcareService.officer(user);
        store.lock();
        store.get("hospital",input.hospitalId(),Hospital.class);
        var email=input.email().trim().toLowerCase(Locale.ROOT);
        if(store.jdbc().queryForObject("SELECT COUNT(*) FROM accounts WHERE email=?",Integer.class,email)>0)
            throw HealthcareService.conflict("Account already exists");
        seedAccount(email,input.password(),input.hospitalId());
    }
    public Map<String,Object> login(Login input) {
        var email=input.email().trim().toLowerCase(Locale.ROOT);
        limit("login:"+email,10,900);
        var rows=store.jdbc().queryForList("SELECT password_hash,hospital_id FROM accounts WHERE email=?",email);
        if(rows.isEmpty() || !passwords.matches(input.password(),(String)rows.getFirst().get("PASSWORD_HASH"))) {
            // Column names are case-insensitive in Spring's JDBC result map.
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email or password");
        }
        return session(new User("Hospital Admin",email,"admin",(String)rows.getFirst().get("hospital_id")));
    }
    public synchronized Map<String,Object> sendOtp(String phone) {
        if(!demo) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"SMS provider is not configured");
        limit("otp:"+phone,5,3600);
        long now=Instant.now().getEpochSecond();
        var old=challenges.get(phone);
        if(old!=null && now-old.sent()<60) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Wait 60 seconds before requesting another code");
        var code=String.format("%04d",random.nextInt(10000));
        challenges.put(phone,new Challenge(code,now+300,now,0));
        return Map.of("message","Development code only; no SMS sent", "developmentCode",code);
    }
    public synchronized Map<String,Object> verify(Otp input) {
        var c=challenges.get(input.phone());
        if(c==null || c.expires()<Instant.now().getEpochSecond() || c.failures()>=5)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Code expired or attempt limit reached");
        if(!MessageDigest.isEqual(c.code().getBytes(StandardCharsets.UTF_8),input.code().getBytes(StandardCharsets.UTF_8))) {
            challenges.put(input.phone(),new Challenge(c.code(),c.expires(),c.sent(),c.failures()+1));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Incorrect verification code");
        }
        challenges.remove(input.phone());
        return session(new User("Patient","+91 "+input.phone(),"patient",null));
    }
    private synchronized void limit(String key,int max,int seconds) {
        long now=Instant.now().getEpochSecond();
        attempts.entrySet().removeIf(e->now-e.getValue().start()>3600);
        var old=attempts.get(key);
        var next=old==null || now-old.start()>=seconds ? new Attempt(now,1) : new Attempt(old.start(),old.count()+1);
        attempts.put(key,next);
        if(next.count()>max) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many attempts. Try later");
    }
    private Map<String,Object> session(User user) {
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        var token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        store.jdbc().update("DELETE FROM sessions WHERE expires_at<?",Instant.now().getEpochSecond());
        store.jdbc().update("INSERT INTO sessions(token_hash,user_json,expires_at) VALUES(?,?,?)",hash(token),store.encode(user),Instant.now().getEpochSecond()+28800);
        return Map.of("token",token,"user",user);
    }
    public User authenticate(String token) {
        if(token==null) return null;
        return store.jdbc().query("SELECT user_json FROM sessions WHERE token_hash=? AND expires_at>?",
            (rs,n)->store.decode(rs.getString(1),User.class),hash(token),Instant.now().getEpochSecond()).stream().findFirst().orElse(null);
    }
    public void logout(String token) { if(token!=null) store.jdbc().update("DELETE FROM sessions WHERE token_hash=?",hash(token)); }
    private String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
