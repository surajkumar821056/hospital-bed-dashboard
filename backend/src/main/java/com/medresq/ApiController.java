package com.medresq;

import static com.medresq.Models.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final HealthcareService service;
    private final AuthService auth;
    private final org.springframework.boot.availability.ApplicationAvailability availability;
    public ApiController(HealthcareService service,AuthService auth,org.springframework.boot.availability.ApplicationAvailability availability) {
        this.service=service; this.auth=auth; this.availability=availability;
    }
    @GetMapping("/health") Map<String,String> health() {
        if(availability.getReadinessState()!=org.springframework.boot.availability.ReadinessState.ACCEPTING_TRAFFIC)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Backend is starting");
        return Map.of("status","UP");
    }
    @PostMapping("/auth/login") Map<String,Object> login(@Valid @RequestBody Login input) { return auth.login(input); }
    @PostMapping("/auth/otp/send") Map<String,Object> sendOtp(@Valid @RequestBody Phone input) { return auth.sendOtp(input.phone()); }
    @PostMapping("/auth/otp/verify") Map<String,Object> verify(@Valid @RequestBody Otp input) { return auth.verify(input); }
    @GetMapping("/auth/me") User me(@AuthenticationPrincipal User user) { return user; }
    @PostMapping("/accounts") Map<String,Boolean> createAccount(@Valid @RequestBody Account input,@AuthenticationPrincipal User user) { auth.createAccount(input,user); return Map.of("success",true); }
    @PostMapping("/auth/logout") Map<String,Boolean> logout(HttpServletRequest request) { auth.logout(SecurityConfig.token(request)); return Map.of("success",true); }
    @GetMapping("/hospitals") List<Hospital> hospitals() { return service.hospitals(); }
    @GetMapping("/hospitals/{id}") Hospital hospital(@PathVariable String id) { return service.hospitals().stream().filter(h->h.id().equals(id)).findFirst().orElseThrow(()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Hospital not found")); }
    @PostMapping("/hospitals") Hospital createHospital(@Valid @RequestBody Hospital h,@AuthenticationPrincipal User user) { return service.createHospital(h,user); }
    @PutMapping("/hospitals/{id}") Hospital updateHospital(@PathVariable String id,@Valid @RequestBody Hospital h,@AuthenticationPrincipal User user) { return service.updateHospital(id,h,user); }
    @GetMapping("/referrals") List<Referral> referrals(@AuthenticationPrincipal User user) { return service.referrals(user); }
    @PostMapping("/referrals") Referral book(@Valid @RequestBody Booking input,@AuthenticationPrincipal User user) { return service.book(input,user); }
    @PatchMapping("/referrals/{id}/status") Referral transition(@PathVariable String id,@Valid @RequestBody Status input,@AuthenticationPrincipal User user) { return service.transition(id,input.status(),user); }
    @GetMapping("/notifications") List<Notice> notifications(@AuthenticationPrincipal User user) { return service.notifications(user).stream().map(n->new Notice(n.id(),n.text(),n.time(),service.unread(n,user),n.audience())).toList(); }
    @PatchMapping("/notifications/{id}/read") Map<String,Boolean> read(@PathVariable String id,@AuthenticationPrincipal User user) { service.readNotice(id,user); return Map.of("success",true); }
    @GetMapping("/ambulances") List<Ambulance> ambulances() { return service.ambulances().stream().map(a->new Ambulance(a.id(),a.name(),a.lat(),a.lng(),a.targetHospitalId(),a.status(),a.speed(),null)).toList(); }
    @PatchMapping("/ambulances/{id}") Ambulance ambulance(@PathVariable String id,@Valid @RequestBody AmbulanceUpdate input,@AuthenticationPrincipal User user) { return service.updateAmbulance(id,input,user); }
    @GetMapping("/system") Disaster system() { return service.system(); }
    @PutMapping("/system") Disaster disaster(@RequestBody Disaster input,@AuthenticationPrincipal User user) { return service.disaster(input,user); }
    @PostMapping("/sos") Sos sos(@Valid @RequestBody Coords coords,@AuthenticationPrincipal User user) { return service.sos(coords,user); }
    @GetMapping("/sos") List<Sos> sosRequests(@AuthenticationPrincipal User user) { return service.sosRequests(user); }
    @PatchMapping("/sos/{id}/status") Sos respondSos(@PathVariable String id,@Valid @RequestBody Status input,@AuthenticationPrincipal User user) { return service.respondSos(id,input.status(),user); }
    @PatchMapping("/sos/{id}/cancel") Sos cancel(@PathVariable String id,@AuthenticationPrincipal User user) { return service.cancelSos(id,user); }
    @GetMapping("/analytics") Map<String,Object> analytics() { return service.analytics(); }
}
