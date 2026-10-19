package com.medresq;

import static com.medresq.Models.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HealthcareService {
    static final Set<String> BED_TYPES=Set.of("general","icu","picu","nicu","ventilator","isolation");
    private final Store store;
    public HealthcareService(Store store) { this.store=store; }
    static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT,message); }
    static void admin(User user,String hospitalId) {
        if(user==null || !user.role().equals("admin") || (user.hospitalId()!=null && !user.hospitalId().equals(hospitalId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This action requires an authorized hospital administrator");
    }
    static void officer(User user) {
        admin(user,null);
    }
    public List<Hospital> hospitals() { return store.all("hospital",Hospital.class); }
    public List<Referral> referrals(User user) {
        return store.all("referral",Referral.class).stream().filter(r->
            user.role().equals("admin") ? user.hospitalId()==null || user.hospitalId().equals(r.hospitalId()) : user.email().equals(r.owner()))
            .sorted(Comparator.comparing(Referral::time).reversed()).toList();
    }
    @Transactional public Hospital updateHospital(String id,Hospital input,User user) {
        admin(user,id); store.lock();
        var old=store.get("hospital",id,Hospital.class);
        if(input.version()!=old.version()) throw conflict("Hospital changed. Refresh before saving");
        if(input.beds()==null || !input.beds().keySet().equals(BED_TYPES)) throw bad("All six bed categories are required");
        for(var entry:input.beds().entrySet()) {
            var bed=entry.getValue();
            if(bed==null || bed.available()>bed.total()) throw bad("Available beds cannot exceed total capacity");
            long reserved=store.all("referral",Referral.class).stream().filter(r->r.hospitalId().equals(id)
                && r.bedType().equals(entry.getKey()) && Set.of("approved","admitted").contains(r.status())).count();
            if(bed.total()-bed.available()<reserved) throw conflict("Inventory must retain beds allocated to active referrals");
        }
        var updated=new Hospital(id,input.name(),input.address(),old.lat(),old.lng(),input.phone(),input.email(),
            Instant.now().toString(),input.beds(),old.version()+1,old.type(),old.specialists(),old.resources(),old.rating(),old.logoBg());
        store.put("hospital",id,updated);
        return updated;
    }
    @Transactional public Hospital createHospital(Hospital input,User user) {
        officer(user); store.lock();
        if(input.id()==null || !input.id().matches("[A-Za-z0-9_-]{1,100}")) throw bad("Valid hospital ID is required");
        if(store.exists("hospital",input.id())) throw conflict("Hospital ID already exists");
        if(!Double.isFinite(input.lat()) || !Double.isFinite(input.lng()) || Math.abs(input.lat())>90 || Math.abs(input.lng())>180) throw bad("Invalid coordinates");
        if(input.beds()==null || !input.beds().keySet().equals(BED_TYPES) || input.beds().values().stream().anyMatch(b->b==null || b.available()>b.total())) throw bad("Invalid bed inventory");
        var h=new Hospital(input.id(),input.name(),input.address(),input.lat(),input.lng(),input.phone(),input.email(),Instant.now().toString(),input.beds(),0,
            input.type(),input.specialists(),input.resources(),input.rating(),input.logoBg());
        store.put("hospital",h.id(),h); return h;
    }
    @Transactional public Referral book(Booking input,User user) {
        if(!user.role().equals("patient")) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sign in as a patient to request admission");
        store.lock();
        var h=store.get("hospital",input.hospitalId(),Hospital.class);
        if(!BED_TYPES.contains(input.bedType())) throw bad("Unknown bed category");
        if(h.beds().get(input.bedType()).available()==0) throw conflict("No available beds of this type");
        var r=new Referral(UUID.randomUUID().toString(),h.id(),h.name(),input.patientName(),input.age(),input.symptom(),input.bedType(),"pending",
            input.coords(),input.vitals(),Instant.now().toString(),user.email(),null);
        store.put("referral",r.id(),r);
        notice("New admission request at "+h.name(),"hospital:"+h.id());
        return r;
    }
    @Transactional public Referral transition(String id,String target,User user) {
        store.lock();
        var r=store.get("referral",id,Referral.class); admin(user,r.hospitalId());
        if(target.equals("accepted")) target="approved";
        if(r.status().equals(target)) return r; // Repeated requests are idempotent.
        boolean valid=switch(r.status()) {
            case "pending" -> Set.of("approved","rejected").contains(target);
            case "approved" -> target.equals("admitted");
            case "admitted" -> target.equals("discharged");
            default -> false;
        };
        if(!valid) throw conflict("Invalid referral transition: "+r.status()+" to "+target);
        var h=store.get("hospital",r.hospitalId(),Hospital.class);
        String ambulanceId=r.ambulanceId();
        if(target.equals("approved") || target.equals("discharged")) {
            var bed=h.beds().get(r.bedType());
            int available=bed.available()+(target.equals("approved") ? -1 : 1);
            if(available<0 || available>bed.total()) throw conflict("Bed capacity cannot satisfy this request");
            var beds=new LinkedHashMap<>(h.beds()); beds.put(r.bedType(),new Bed(bed.total(),available));
            store.put("hospital",h.id(),new Hospital(h.id(),h.name(),h.address(),h.lat(),h.lng(),h.phone(),h.email(),Instant.now().toString(),beds,
                h.version()+1,h.type(),h.specialists(),h.resources(),h.rating(),h.logoBg()));
            if(target.equals("approved")) {
                var ambulance=store.all("ambulance",Ambulance.class).stream().filter(a->a.status().equals("standby")).findFirst();
                if(ambulance.isPresent()) {
                    var a=ambulance.get(); ambulanceId=a.id();
                    store.put("ambulance",a.id(),new Ambulance(a.id(),a.name(),a.lat(),a.lng(),h.id(),"transit",0,r.id()));
                }
            }
        }
        if(target.equals("admitted") && ambulanceId!=null) {
            var a=store.get("ambulance",ambulanceId,Ambulance.class);
            store.put("ambulance",a.id(),new Ambulance(a.id(),a.name(),h.lat(),h.lng(),null,"standby",0,null));
        }
        var updated=new Referral(r.id(),r.hospitalId(),r.hospitalName(),r.patientName(),r.age(),r.symptom(),r.bedType(),target,r.coords(),r.vitals(),r.time(),r.owner(),ambulanceId);
        store.put("referral",id,updated);
        notice("Admission request "+target+" at "+h.name()+(target.equals("approved") ? (ambulanceId==null ? "; awaiting an available ambulance" : "; ambulance assigned") : ""),"user:"+r.owner());
        return updated;
    }
    public List<Notice> notifications(User user) {
        return store.all("notice",Notice.class).stream().filter(n->visible(n,user)).sorted(Comparator.comparing(Notice::time).reversed()).limit(100).toList();
    }
    private boolean visible(Notice n,User u) {
        return n.audience().equals("user:"+u.email()) || (u.role().equals("admin") &&
            (u.hospitalId()==null || n.audience().equals("hospital:"+u.hospitalId()))) || n.audience().equals("all");
    }
    @Transactional public void readNotice(String id,User user) {
        store.lock(); var n=store.get("notice",id,Notice.class);
        if(!visible(n,user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Notification access denied");
        // Per-user receipt prevents one administrator marking everyone's notifications read.
        store.put("receipt",user.email()+":"+id,Map.of("read",true));
    }
    public boolean unread(Notice n,User user) { return !store.exists("receipt",user.email()+":"+n.id()); }
    private void notice(String text,String audience) {
        var id=UUID.randomUUID().toString(); store.put("notice",id,new Notice(id,text,Instant.now().toString(),true,audience));
    }
    public Disaster system() { return store.get("system","state",Disaster.class); }
    @Transactional public Disaster disaster(Disaster state,User user) {
        officer(user); store.lock(); store.put("system","state",state);
        notice("Municipal disaster mode "+(state.disasterMode()?"activated":"deactivated"),"all"); return state;
    }
    @Transactional public Sos sos(Coords coords,User user) {
        store.lock(); var id=UUID.randomUUID().toString();
        var sos=new Sos(id,coords,"pending",Instant.now().toString(),user.email()); store.put("sos",id,sos);
        notice("SOS request recorded; awaiting operator response","user:"+user.email());
        notice("New SOS request "+id,"hospital:dispatch"); return sos;
    }
    public List<Sos> sosRequests(User user) {
        return store.all("sos",Sos.class).stream().filter(s->user.role().equals("admin") && user.hospitalId()==null || s.owner().equals(user.email())).toList();
    }
    @Transactional public Sos respondSos(String id,String status,User user) {
        officer(user); store.lock(); var s=store.get("sos",id,Sos.class);
        if(status.equals(s.status())) return s;
        if(!(s.status().equals("pending") && status.equals("acknowledged") || s.status().equals("acknowledged") && status.equals("resolved")))
            throw conflict("Invalid SOS transition");
        var updated=new Sos(s.id(),s.coords(),status,s.time(),s.owner()); store.put("sos",id,updated);
        notice("SOS request "+status+" by operator","user:"+s.owner()); return updated;
    }
    @Transactional public Sos cancelSos(String id,User user) {
        store.lock(); var s=store.get("sos",id,Sos.class);
        if(!s.owner().equals(user.email())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"SOS access denied");
        var updated=new Sos(s.id(),s.coords(),"cancelled",s.time(),s.owner()); store.put("sos",id,updated); return updated;
    }
    public List<Ambulance> ambulances() { return store.all("ambulance",Ambulance.class); }
    @Transactional public Ambulance updateAmbulance(String id,AmbulanceUpdate input,User user) {
        officer(user); store.lock(); var old=store.get("ambulance",id,Ambulance.class);
        if(old.referralId()!=null && input.status().equals("standby")) throw conflict("Admit the assigned patient before releasing the ambulance");
        var updated=new Ambulance(id,old.name(),input.coords().lat(),input.coords().lng(),old.targetHospitalId(),input.status(),0,old.referralId());
        store.put("ambulance",id,updated); return updated;
    }
    public Map<String,Object> analytics() {
        var beds=new LinkedHashMap<String,Bed>(); BED_TYPES.stream().sorted().forEach(type->beds.put(type,new Bed(0,0)));
        for(var h:hospitals()) for(var type:BED_TYPES) {
            var b=beds.get(type); var hb=h.beds().get(type); beds.put(type,new Bed(b.total()+hb.total(),b.available()+hb.available()));
        }
        int total=beds.values().stream().mapToInt(Bed::total).sum(), available=beds.values().stream().mapToInt(Bed::available).sum();
        return Map.of("beds",beds,"total",total,"available",available,"occupied",total-available,
            "occupancyRate",total==0?0:Math.round(100.0*(total-available)/total),"generatedAt",Instant.now().toString());
    }
}
