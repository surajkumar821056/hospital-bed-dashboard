package com.medresq;

import static com.medresq.Models.*;
import java.util.*;
import java.time.Instant;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SeedData implements CommandLineRunner {
    private final Store store;
    private final AuthService auth;
    private final boolean demo;
    private final String email,password;
    public SeedData(Store store,AuthService auth,@Value("${app.demo:false}") boolean demo,
        @Value("${app.admin.email}") String email,@Value("${app.admin.password}") String password) {
        this.store=store; this.auth=auth; this.demo=demo; this.email=email; this.password=password;
    }
    @Override @Transactional public void run(String... args) throws Exception {
        if(password.isBlank() || (!demo && password.length()<12))
            throw new IllegalStateException("Set ADMIN_PASSWORD to at least 12 characters for production");
        store.lock();
        auth.seedAccount(email,password,null);
        if(!store.exists("system","state")) store.put("system","state",new Disaster(false));
        if(demo && store.all("hospital",Hospital.class).isEmpty()) {
            try(var input=getClass().getResourceAsStream("/hospitals.json")) {
                var hospitals=store.json().readValue(input,Hospital[].class);
                for(var h:hospitals) {
                    store.put("hospital",h.id(),h);
                    auth.seedAccount(h.email(),password,h.id());
                }
            }
            store.put("ambulance","AMB_001",new Ambulance("AMB_001","MedResQ Rescue 1 (ALS)",28.58,77.22,null,"standby",0,null));
            store.put("ambulance","AMB_002",new Ambulance("AMB_002","MedResQ Rescue 2 (BLS)",28.60,77.35,null,"standby",0,null));
            store.put("ambulance","AMB_003",new Ambulance("AMB_003","MedResQ Rescue 3 (ALS)",28.48,77.45,null,"standby",0,null));
        }
    }
}
