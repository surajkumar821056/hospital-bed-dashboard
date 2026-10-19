package com.medresq;

import java.util.Map;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class Models {
    private Models() {}
    public record Bed(@Min(0) @Max(100000) int total, @Min(0) @Max(100000) int available) {}
    public record Hospital(String id, @NotBlank @Size(max=200) String name,
        @NotBlank @Size(max=500) String address, double lat, double lng,
        @NotBlank @Size(max=40) String phone, @Email @NotBlank String email,
        String lastUpdated, @NotNull Map<String, @Valid Bed> beds, long version,
        String type, List<String> specialists, List<String> resources, String rating, String logoBg) {}
    public record Coords(@DecimalMin("-90") @DecimalMax("90") double lat,
                         @DecimalMin("-180") @DecimalMax("180") double lng) {}
    public record Vitals(@Min(1) @Max(300) int pulse,
        @NotBlank @Pattern(regexp="[0-9]{2,3}/[0-9]{2,3}") String bp,
        @Min(1) @Max(100) int spo2) {}
    public record Booking(@NotBlank String hospitalId, @NotBlank @Size(max=120) String patientName,
        @Min(0) @Max(130) int age, @NotBlank @Size(max=3000) String symptom,
        @NotBlank String bedType, @NotNull @Valid Coords coords, @NotNull @Valid Vitals vitals) {}
    public record Referral(String id, String hospitalId, String hospitalName, String patientName,
        int age, String symptom, String bedType, String status, Coords coords, Vitals vitals,
        String time, String owner, String ambulanceId) {}
    public record User(String name, String email, String role, String hospitalId) {}
    public record Login(@NotBlank @Email String email, @NotBlank String password) {}
    public record Account(@NotBlank @Email String email, @NotBlank @Size(min=12,max=72) String password,
                          @NotBlank String hospitalId) {}
    public record Phone(@Pattern(regexp="[0-9]{10}") @NotNull String phone) {}
    public record Otp(@Pattern(regexp="[0-9]{10}") @NotNull String phone,
                      @Pattern(regexp="[0-9]{4}") @NotNull String code) {}
    public record Status(@NotBlank String status) {}
    public record Disaster(boolean disasterMode) {}
    public record Ambulance(String id, String name, double lat, double lng, String targetHospitalId,
                            String status, double speed, String referralId) {}
    public record AmbulanceUpdate(@NotNull @Valid Coords coords,
                                 @Pattern(regexp="standby|transit|arrived") @NotNull String status) {}
    public record Notice(String id, String text, String time, boolean unread, String audience) {}
    public record Sos(String id, Coords coords, String status, String time, String owner) {}
}
