package com.medresq;

import static com.medresq.Models.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:healthcare;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.sql.init.schema-locations=classpath:schema.sql", "spring.profiles.active=dev"})
@AutoConfigureMockMvc
class HealthcareIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired Store store;
    @Autowired HealthcareService service;
    @Autowired PlatformTransactionManager manager;
    final User patient=new User("Patient","+91 9876543210","patient",null);
    final User admin=new User("Officer","admin@medresq.gov","admin",null);
    @BeforeEach void reset() throws Exception {
        try(var input=getClass().getResourceAsStream("/hospitals.json")) {
            var hospitals=store.json().readValue(input,Hospital[].class);
            new TransactionTemplate(manager).executeWithoutResult(tx->{
                store.lock(); store.jdbc().update("DELETE FROM documents WHERE kind<>'system'");
                for(var h:hospitals) store.put("hospital",h.id(),h);
                store.put("ambulance","AMB_001",new Ambulance("AMB_001","Rescue",28.58,77.22,null,"standby",0,null));
            });
        }
    }
    Booking booking(String hospital) {
        return new Booking(hospital,"Test Patient",35,"Test condition","icu",new Coords(28.6,77.2),new Vitals(80,"120/80",98));
    }
    String login() throws Exception {
        var response=mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"admin@medresq.gov\",\"password\":\"admin\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return store.json().readTree(response).get("token").asText();
    }
    @Test void authenticationAndLogoutAreEnforced() throws Exception {
        mvc.perform(get("/api/hospitals")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(12));
        mvc.perform(get("/api/referrals")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"admin@medresq.gov\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        var token=login();
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(post("/api/auth/logout").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void otpCannotBeGuessedOrReused() throws Exception {
        var result=mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
            .content("{\"phone\":\"9123456789\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var code=store.json().readTree(result).get("developmentCode").asText();
        var wrong=code.equals("0000")?"0001":"0000";
        mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
            .content(store.encode(new Otp("9123456789",wrong)))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
            .content(store.encode(new Otp("9123456789",code)))).andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("patient"));
        mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
            .content(store.encode(new Otp("9123456789",code)))).andExpect(status().isUnauthorized());
    }
    @Test void workflowAllocatesAndReleasesExactlyOneBed() {
        int original=service.hospitals().getFirst().beds().get("icu").available();
        var r=service.book(booking("HOSP_001"),patient);
        assertThat(service.transition(r.id(),"approved",admin).ambulanceId()).isEqualTo("AMB_001");
        service.transition(r.id(),"approved",admin);
        assertThat(store.get("hospital","HOSP_001",Hospital.class).beds().get("icu").available()).isEqualTo(original-1);
        assertThatThrownBy(()->service.transition(r.id(),"discharged",admin)).hasMessageContaining("Invalid referral transition");
        service.transition(r.id(),"admitted",admin);
        service.transition(r.id(),"discharged",admin);
        service.transition(r.id(),"discharged",admin);
        assertThat(store.get("hospital","HOSP_001",Hospital.class).beds().get("icu").available()).isEqualTo(original);
        assertThat(service.ambulances().getFirst().status()).isEqualTo("standby");
    }
    @Test void patientPrivacyAndHospitalScopeAreEnforced() {
        var r=service.book(booking("HOSP_001"),patient);
        var other=new User("Other","+91 9999999999","patient",null);
        var hospitalAdmin=new User("Other hospital","contact@fortisnoida.com","admin","HOSP_004");
        assertThat(service.referrals(other)).isEmpty();
        assertThat(service.referrals(hospitalAdmin)).isEmpty();
        assertThatThrownBy(()->service.transition(r.id(),"approved",hospitalAdmin)).hasMessageContaining("authorized hospital");
        assertThatThrownBy(()->service.disaster(new Disaster(true),hospitalAdmin)).hasMessageContaining("authorized hospital");
    }
    @Test void concurrentApprovalsCannotOversellLastBed() throws Exception {
        var requests=new ArrayList<Referral>();
        for(int i=0;i<6;i++) requests.add(service.book(booking("HOSP_005"),patient));
        try(var pool=Executors.newFixedThreadPool(6)) {
            var futures=requests.stream().map(r->pool.submit(()->{
                try { service.transition(r.id(),"approved",admin); return true; }
                catch(org.springframework.web.server.ResponseStatusException e) { return false; }
            })).toList();
            int successes=0; for(var future:futures) if(future.get(10,TimeUnit.SECONDS)) successes++;
            assertThat(successes).isEqualTo(1);
        }
        assertThat(store.get("hospital","HOSP_005",Hospital.class).beds().get("icu").available()).isZero();
    }
    @Test void invalidInventoryAndStaleVersionAreRejected() throws Exception {
        var token=login(); var h=store.get("hospital","HOSP_001",Hospital.class);
        var beds=new LinkedHashMap<>(h.beds()); beds.put("icu",new Bed(4,5));
        var invalid=new Hospital(h.id(),h.name(),h.address(),h.lat(),h.lng(),h.phone(),h.email(),h.lastUpdated(),beds,h.version(),h.type(),h.specialists(),h.resources(),h.rating(),h.logoBg());
        mvc.perform(put("/api/hospitals/HOSP_001").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(store.encode(invalid)))
            .andExpect(status().isBadRequest());
        service.updateHospital(h.id(),h,admin);
        assertThatThrownBy(()->service.updateHospital(h.id(),h,admin)).hasMessageContaining("Refresh before saving");
    }
    @Test void bookingEndpointValidatesAndPersistsPatientRequest() throws Exception {
        var sent=mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
            .content("{\"phone\":\"9234567890\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var code=store.json().readTree(sent).get("developmentCode").asText();
        var verified=mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
            .content(store.encode(new Otp("9234567890",code)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var token=store.json().readTree(verified).get("token").asText();
        mvc.perform(post("/api/referrals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
            .content(store.encode(booking("HOSP_001")))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("pending"));
        mvc.perform(get("/api/referrals").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/api/referrals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
            .content("{\"hospitalId\":\"HOSP_001\"}")).andExpect(status().isBadRequest());
    }
    @Test void sosResponseAndReadReceiptsAreScopedToEachUser() {
        var sos=service.sos(new Coords(28.6,77.2),patient);
        service.respondSos(sos.id(),"acknowledged",admin);
        assertThat(service.sosRequests(patient).getFirst().status()).isEqualTo("acknowledged");
        assertThatThrownBy(()->service.respondSos(sos.id(),"resolved",patient)).hasMessageContaining("authorized hospital");
        service.respondSos(sos.id(),"resolved",admin);
        var notice=service.notifications(patient).getFirst();
        service.readNotice(notice.id(),patient);
        assertThat(service.unread(notice,patient)).isFalse();
        assertThat(service.unread(notice,admin)).isTrue();
    }
}
