import React, { useState } from "react";
import { X, User, ShieldAlert, LogIn, Lock, Phone, Mail } from "lucide-react";

export default function AuthModal({ isOpen, onClose, onLoginSuccess, lang }) {
  const [activeTab, setActiveTab] = useState("patient"); // patient, admin
  
  // Patient fields
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Admin fields
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError(lang === "hi" ? "कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
    }, 800);
  };

  const handlePatientLogin = (e) => {
    e.preventDefault();
    if (!otp) {
      setError(lang === "hi" ? "कृपया प्राप्त ओटीपी दर्ज करें।" : "Please enter the OTP sent to your phone.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        name: "Srotrai",
        email: `+91 ${phone.substring(0, 5)} ${phone.substring(5)}`,
        role: "patient"
      });
      resetForm();
      onClose();
    }, 800);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (!email || !pin) {
      setError(lang === "hi" ? "कृपया सभी फ़ील्ड भरें।" : "Please enter both credentials.");
      return;
    }
    if (email.toLowerCase().trim() !== "admin@medresq.gov" || pin !== "admin") {
      setError(lang === "hi" ? "अमान्य विवरण। कृपया admin@medresq.gov और admin पासवर्ड का उपयोग करें।" : "Invalid credentials. Use admin@medresq.gov / admin.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        name: "Officer",
        email: email,
        role: "admin"
      });
      resetForm();
      onClose();
      // Redirect to #admin
      window.location.hash = "admin";
    }, 800);
  };

  const resetForm = () => {
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setEmail("");
    setPin("");
    setError("");
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div className="glass" style={{
        width: "100%",
        maxWidth: "380px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: "var(--shadow-lg)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <LogIn size={16} className="text-primary" />
            {lang === "hi" ? "मेडरेस्क्यू लॉगिन गेटवे" : "MedResQ Login Gateway"}
          </strong>
          <button 
            onClick={() => { resetForm(); onClose(); }}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.1rem" }}
          >
            ✕
          </button>
        </div>

        {/* Tab switchers */}
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--surface-hover)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <button
            onClick={() => { setActiveTab("patient"); setError(""); }}
            style={{
              flex: 1,
              padding: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              backgroundColor: activeTab === "patient" ? "var(--surface)" : "transparent",
              color: activeTab === "patient" ? "var(--primary)" : "var(--text-secondary)",
              boxShadow: activeTab === "patient" ? "var(--shadow-sm)" : "none"
            }}
          >
            <User size={12} />
            {lang === "hi" ? "मरीज / उपयोगकर्ता" : "Patient Portal"}
          </button>
          <button
            onClick={() => { setActiveTab("admin"); setError(""); }}
            style={{
              flex: 1,
              padding: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              backgroundColor: activeTab === "admin" ? "var(--surface)" : "transparent",
              color: activeTab === "admin" ? "var(--danger)" : "var(--text-secondary)",
              boxShadow: activeTab === "admin" ? "var(--shadow-sm)" : "none"
            }}
          >
            <ShieldAlert size={12} />
            {lang === "hi" ? "अधिकारी / एडमिन" : "Admin Panel"}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: "0.68rem", color: "var(--danger)", backgroundColor: "rgba(239, 68, 68, 0.08)", padding: "8px", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Patient Login Form */}
        {activeTab === "patient" && (
          <form onSubmit={otpSent ? handlePatientLogin : handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                {lang === "hi" ? "मोबाइल नंबर" : "Mobile Number"}
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Phone size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").substring(0, 10))}
                  disabled={otpSent || loading}
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 32px",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-hover)",
                    color: "var(--text-primary)",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {otpSent && (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  {lang === "hi" ? "ओटीपी कोड" : "One-Time Password (OTP)"}
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Lock size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
                  <input
                    type="password"
                    placeholder="Enter 4-digit code (e.g. 1234)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").substring(0, 4))}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 32px",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-primary)",
                      outline: "none"
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.6rem", color: "var(--success)", fontWeight: 600, marginTop: "2px" }}>
                  🟢 Test SMS OTP simulated. Type any digit code to login.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginTop: "4px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {loading ? (lang === "hi" ? "प्रसंस्करण..." : "Processing...") : (otpSent ? (lang === "hi" ? "सत्यापित करें और लॉग इन करें" : "Verify & Sign In") : (lang === "hi" ? "ओटीपी भेजें" : "Send Verification OTP"))}
            </button>
          </form>
        )}

        {/* Admin Login Form */}
        {activeTab === "admin" && (
          <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                {lang === "hi" ? "अधिकारी ईमेल / आईडी" : "Officer Email / User ID"}
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Mail size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  placeholder="officer@medresq.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 32px",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-hover)",
                    color: "var(--text-primary)",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                {lang === "hi" ? "सुरक्षा पिन / पासवर्ड" : "Security Password / PIN"}
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Lock size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "10px 10px 10px 32px",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-hover)",
                    color: "var(--text-primary)",
                    outline: "none"
                  }}
                />
              </div>
              <span style={{ fontSize: "0.6rem", color: "var(--success)", fontWeight: 600, marginTop: "2px" }}>
                🟢 Demo credentials - User ID: admin@medresq.gov | Password: admin
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-danger"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginTop: "4px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--danger)",
                border: "none",
                color: "#ffffff"
              }}
            >
              {loading ? (lang === "hi" ? "प्रमाणीकरण..." : "Authenticating...") : (lang === "hi" ? "सुरक्षित लॉगिन" : "Secure Officer Sign In")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
