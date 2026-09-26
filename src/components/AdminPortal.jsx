import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Settings, Save, FileText, ShieldAlert, AlertCircle, CheckCircle, TrendingUp, Plus, Activity, Clock } from "lucide-react";
import { getBedTypeLabel } from "../utils/mockData";

export default function AdminPortal({ hospitals, onUpdateHospital, lang, referrals, setReferrals, setNotifications, onClose, currentUser, setCurrentUser }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeHospitalId, setActiveHospitalId] = useState(null);

  // Form states
  const [bedsForm, setBedsForm] = useState({});
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [workflowTab, setWorkflowTab] = useState("incoming");

  useEffect(() => {
    if (currentUser && currentUser.role === "admin") {
      setIsLoggedIn(true);
      const matchedHosp = hospitals.find(h => h.email.toLowerCase() === currentUser.email.toLowerCase()) || hospitals.find(h => h.id === "HOSP_001") || hospitals[0];
      setActiveHospitalId(matchedHosp.id);
      setBedsForm(matchedHosp.beds);
      setProfileForm({
        name: matchedHosp.name,
        phone: matchedHosp.phone,
        address: matchedHosp.address,
        email: matchedHosp.email
      });
    } else {
      setIsLoggedIn(false);
    }
  }, [currentUser, hospitals]);

  // Translations
  const trans = {
    en: {
      title: "MedResQ - Hospital Login",
      sub: "MedResQ is an AI-powered emergency healthcare platform that provides real-time hospital bed availability, ICU bed tracking, ambulance coordination, and status updates.",
      emailLabel: "Hospital Admin Email",
      passLabel: "Access Password",
      btnLogIn: "Authorize Session",
      btnLogOut: "Log Out",
      invalidCreds: "Invalid credentials. Hint: use any admin email from mockData (e.g. emergency@aiims.edu) and password 'admin'",
      welcome: "Welcome,",
      manageInventory: "Manage Live Bed Inventory",
      editProfile: "Manage Hospital Profile",
      occupancyTrends: "Live Occupancy Distribution",
      lowAlerts: "Capacity Warning Status",
      saveBtn: "Save Updates",
      phone: "Phone Number",
      address: "Address",
      name: "Hospital Name",
      successMsg: "Data synchronized successfully!",
      noAlerts: "No low-capacity warnings. Safe thresholds maintained."
    },
    hi: {
      title: "मेडरेस्क्यू हेल्थ - अस्पताल लॉगिन",
      sub: "मेडरेस्क्यू एक एआई-संचालित आपातकालीन स्वास्थ्य सेवा मंच है जो वास्तविक समय में अस्पताल के बेड की उपलब्धता, आईसीयू बेड ट्रैकिंग और एम्बुलेंस समन्वय प्रदान करता है।",
      emailLabel: "अस्पताल एडमिन ईमेल",
      passLabel: "एक्सेस पासवर्ड",
      btnLogIn: "सत्र अधिकृत करें",
      btnLogOut: "लॉग आउट करें",
      invalidCreds: "अमान्य क्रेडेंशियल। संकेत: mockData से किसी भी एडमिन ईमेल का उपयोग करें (जैसे emergency@aiims.edu) और पासवर्ड 'admin'",
      welcome: "स्वागत है,",
      manageInventory: "लाइव बेड सूची प्रबंधित करें",
      editProfile: "अस्पताल प्रोफ़ाइल प्रबंधित करें",
      occupancyTrends: "लाइव अधिभोग वितरण",
      lowAlerts: "क्षमता चेतावनी स्थिति",
      saveBtn: "अपडेट सहेजें",
      phone: "फ़ोन नंबर",
      address: "पता",
      name: "अस्पताल का नाम",
      successMsg: "डेटा सफलतापूर्वक समन्वयित किया गया!",
      noAlerts: "कोई कम-क्षमता चेतावनी नहीं। सुरक्षित सीमाएं बनाए रखी गई हैं।"
    }
  };

  const t = trans[lang] || trans.en;

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const matchedHosp = hospitals.find(h => h.email.toLowerCase() === email.toLowerCase());
    if (matchedHosp && password === "admin") {
      setIsLoggedIn(true);
      setActiveHospitalId(matchedHosp.id);
      setBedsForm(matchedHosp.beds);
      setProfileForm({
        name: matchedHosp.name,
        phone: matchedHosp.phone,
        address: matchedHosp.address,
        email: matchedHosp.email
      });
      if (setCurrentUser) {
        setCurrentUser({
          name: "Hospital Admin",
          email: matchedHosp.email,
          role: "admin"
        });
      }
    } else {
      setErrorMsg(t.invalidCreds);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveHospitalId(null);
    setEmail("");
    setPassword("");
    if (setCurrentUser) setCurrentUser(null);
    window.location.hash = "";
    if (onClose) onClose();
  };

  const handleApproveReferral = (ref) => {
    if (!activeHospital) return;
    const currentAvailable = activeHospital.beds[ref.bedType]?.available || 0;
    if (currentAvailable <= 0) {
      alert("Error: No available beds of this type to allocate!");
      return;
    }

    // 1. Deduct bed count in hospital object
    const updatedBeds = {
      ...activeHospital.beds,
      [ref.bedType]: {
        ...activeHospital.beds[ref.bedType],
        available: currentAvailable - 1
      }
    };

    const updatedHospital = {
      ...activeHospital,
      beds: updatedBeds,
      lastUpdated: new Date().toISOString()
    };

    // 2. Trigger parent update
    onUpdateHospital(updatedHospital);
    // Sync local form state
    setBedsForm(updatedBeds);

    // 3. Update referral status to approved
    setReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: "approved" } : r));

    // 4. Send dynamic notification in app
    setNotifications(prev => [
      {
        id: `REF_APR_${Date.now()}`,
        text: `🚨 REFERRAL CONFIRMED: ${ref.patientName} allocated ${ref.bedType.toUpperCase()} bed at ${activeHospital.name}. Rescue ambulance dispatched!`,
        time: "Just now",
        unread: true
      },
      ...prev
    ]);

    alert(`Referral Approved! ${ref.bedType.toUpperCase()} bed allocated at ${activeHospital.name}. Ambulance dispatched.`);
  };

  const handleDeclineReferral = (refId) => {
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status: "rejected" } : r));

    setNotifications(prev => [
      {
        id: `REF_DEC_${Date.now()}`,
        text: `🟢 Booking request declined by ${activeHospital.name}.`,
        time: "Just now",
        unread: true
      },
      ...prev
    ]);
  };

  const handleAdmitPatient = (refId) => {
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status: "admitted" } : r));
    
    setNotifications(prev => [
      {
        id: `ADMIT_${Date.now()}`,
        text: `🏥 ADMITTED: Patient arrived at ${activeHospital.name} and successfully admitted.`,
        time: "Just now",
        unread: true
      },
      ...prev
    ]);
  };

  const handleDischargePatient = (ref) => {
    if (!activeHospital) return;
    const currentAvailable = activeHospital.beds[ref.bedType]?.available || 0;
    const currentTotal = activeHospital.beds[ref.bedType]?.total || 1;

    // Increment available bed count (release reservation)
    const updatedBeds = {
      ...activeHospital.beds,
      [ref.bedType]: {
        ...activeHospital.beds[ref.bedType],
        available: Math.min(currentTotal, currentAvailable + 1)
      }
    };

    const updatedHospital = {
      ...activeHospital,
      beds: updatedBeds,
      lastUpdated: new Date().toISOString()
    };

    onUpdateHospital(updatedHospital);
    setBedsForm(updatedBeds);

    setReferrals(prev => prev.map(r => r.id === ref.id ? { ...r, status: "discharged" } : r));

    setNotifications(prev => [
      {
        id: `DISCH_${Date.now()}`,
        text: `🟢 DISCHARGED: ${ref.patientName} discharged from ${activeHospital.name}. Bed released back to inventory.`,
        time: "Just now",
        unread: true
      },
      ...prev
    ]);
  };

  const activeHospital = hospitals.find(h => h.id === activeHospitalId);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!activeHospital) return;

    const updated = {
      ...activeHospital,
      name: profileForm.name,
      phone: profileForm.phone,
      address: profileForm.address,
      email: profileForm.email,
      lastUpdated: new Date().toISOString()
    };

    onUpdateHospital(updated);
    alert(t.successMsg);
  };

  const handleSaveBeds = (e) => {
    e.preventDefault();
    if (!activeHospital) return;

    let isValid = true;
    Object.entries(bedsForm).forEach(([key, val]) => {
      if (parseInt(val.available) > parseInt(val.total)) {
        alert(`Error in ${getBedTypeLabel(key)}: Available beds cannot exceed total capacity.`);
        isValid = false;
      }
    });

    if (!isValid) return;

    const updatedBeds = {};
    Object.entries(bedsForm).forEach(([key, val]) => {
      updatedBeds[key] = {
        total: parseInt(val.total),
        available: parseInt(val.available)
      };
    });

    const updated = {
      ...activeHospital,
      beds: updatedBeds,
      lastUpdated: new Date().toISOString()
    };

    onUpdateHospital(updated);
    alert(t.successMsg);
  };

  const handleAcceptReferral = (id) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
    
    // Auto-update bed counts to simulate bed allocation
    if (bedsForm.icu && bedsForm.icu.available > 0) {
      const updatedBeds = {
        ...bedsForm,
        icu: { ...bedsForm.icu, available: bedsForm.icu.available - 1 }
      };
      setBedsForm(updatedBeds);
      
      const updated = {
        ...activeHospital,
        beds: updatedBeds,
        lastUpdated: new Date().toISOString()
      };
      onUpdateHospital(updated);
    }
  };

  // Render Login Panel
  if (!isLoggedIn) {
    return (
      <div className="admin-login-card glass">
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
          <LogIn size={40} style={{ margin: "0 auto", color: "var(--primary)" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{t.title}</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{t.sub}</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>{t.emailLabel}</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. admin@sgpgi.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t.passLabel}</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem"
            }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            <LogIn size={16} />
            <span>{t.btnLogIn}</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span>Exit to Public Registry</span>
          </button>
        </form>
      </div>
    );
  }

  // Render Admin Console
  const localAlerts = [];
  if (activeHospital) {
    const icu = activeHospital.beds.icu;
    const vent = activeHospital.beds.ventilator;

    if (icu.available <= 1) {
      localAlerts.push(`Critical ICU shortage: Only ${icu.available} bed(s) available.`);
    }
    if (vent.available === 0) {
      localAlerts.push("Critical Ventilator shortage: 0 remaining.");
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 2000,
      backgroundColor: "var(--bg-app)",
      overflowY: "auto",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      boxSizing: "border-box"
    }}>
      {/* Standalone Control Center Banner */}
      <div className="glass" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1.5px solid var(--primary)",
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.25rem" }}>🏢</span>
          <strong style={{ fontSize: "0.85rem", letterSpacing: "0.08em", color: "var(--primary)", textTransform: "uppercase" }}>
            MEDRESQ GOVERNMENT & HOSPITAL CONTROL CONSOLE
          </strong>
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          SECURE SEC-SH-522 // STATUS: SECURE CONNECTED
        </span>
      </div>

      {/* Admin Header */}
      <div className="glass" style={{
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "var(--primary-glow)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Settings size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{t.welcome} {activeHospital.name}</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Admin Console Session Active • ID: {activeHospital.id}
            </p>
          </div>
        </div>
        
        {/* Performance Score */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Performance Rating:</span>
          <span style={{
            backgroundColor: "var(--success-bg)",
            color: "var(--success)",
            border: "1px solid var(--success-border)",
            fontSize: "0.85rem",
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: "6px"
          }}>
            {activeHospital.id === "HOSP_001" ? "98 / 100" : activeHospital.id === "HOSP_003" ? "95 / 100" : "90 / 100"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} className="btn btn-secondary">
            <span>Exit to Public Registry</span>
          </button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <LogOut size={16} />
            <span>{t.btnLogOut}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: "1.5rem"
      }}>
        {/* Bed Inventory Panel */}
        <div className="glass" style={{
          padding: "1.5rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <FileText size={18} className="text-primary" />
            <h4 style={{ fontWeight: 700 }}>{t.manageInventory}</h4>
          </div>

          <form onSubmit={handleSaveBeds} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.keys(bedsForm).map((bedType) => (
              <div key={bedType} style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                alignItems: "center",
                gap: "12px"
              }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{getBedTypeLabel(bedType)}</span>
                
                <div className="form-group">
                  <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>AVAILABLE</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={bedsForm[bedType]?.available || 0}
                    onChange={(e) => setBedsForm({
                      ...bedsForm,
                      [bedType]: { ...bedsForm[bedType], available: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>

                <div className="form-group">
                  <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>CAPACITY</span>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bedsForm[bedType]?.total || 0}
                    onChange={(e) => setBedsForm({
                      ...bedsForm,
                      [bedType]: { ...bedsForm[bedType], total: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            ))}

            <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem", alignSelf: "flex-end" }}>
              <Save size={16} />
              <span>{t.saveBtn}</span>
            </button>
          </form>
        </div>

        {/* Profile and Alarms Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Emergency Referrals & Booking Desk */}
          <div className="glass" style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🚑</span>
              <h4 style={{ fontWeight: 700, margin: 0 }}>Clinical Referral & Workflow Desk</h4>
            </div>

            {/* Workflow Tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", backgroundColor: "var(--bg-app)", padding: "2px", borderRadius: "var(--radius-md)" }}>
              <button 
                className={`btn ${workflowTab === "incoming" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWorkflowTab("incoming")}
                style={{ fontSize: "0.68rem", padding: "4px", border: "none", boxShadow: "none" }}
              >
                Incoming ({referrals ? referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "pending").length : 0})
              </button>
              <button 
                className={`btn ${workflowTab === "transit" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWorkflowTab("transit")}
                style={{ fontSize: "0.68rem", padding: "4px", border: "none", boxShadow: "none" }}
              >
                In Transit ({referrals ? referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "approved").length : 0})
              </button>
              <button 
                className={`btn ${workflowTab === "admitted" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWorkflowTab("admitted")}
                style={{ fontSize: "0.68rem", padding: "4px", border: "none", boxShadow: "none" }}
              >
                Admitted ({referrals ? referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "admitted").length : 0})
              </button>
            </div>

            {/* Workflow Panels */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto", minHeight: "120px" }}>
              {workflowTab === "incoming" && (
                (!referrals || referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "pending").length === 0) ? (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>No pending requests.</span>
                ) : (
                  referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "pending").map(ref => (
                    <div key={ref.id} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{ref.patientName} ({ref.age} yrs)</strong>
                        <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: "0.62rem", textTransform: "uppercase" }}>{ref.bedType.toUpperCase()} BED</span>
                      </div>
                      
                      {/* Vitals breakdown */}
                      {ref.vitals && (
                        <div style={{ display: "flex", gap: "8px", fontSize: "0.65rem", color: "var(--primary)", backgroundColor: "var(--primary-glow)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600 }}>
                          <span>💓 Pulse: {ref.vitals.pulse} BPM</span>
                          <span>🩸 BP: {ref.vitals.bp}</span>
                          <span>🫁 SpO2: {ref.vitals.spo2}%</span>
                        </div>
                      )}

                      <div style={{ color: "var(--text-secondary)", fontSize: "0.7rem", lineHeight: 1.3 }}>
                        <strong>Symptoms:</strong> {ref.symptom}
                      </div>

                      <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
                        <button 
                          onClick={() => handleApproveReferral(ref)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: "4px 8px", fontSize: "0.68rem", backgroundColor: "var(--success)", border: "none", color: "#ffffff" }}
                        >
                          ✓ Approve & Dispatch
                        </button>
                        <button 
                          onClick={() => handleDeclineReferral(ref.id)}
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: "4px 8px", fontSize: "0.68rem", color: "var(--danger)" }}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {workflowTab === "transit" && (
                (!referrals || referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "approved").length === 0) ? (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>No active transports.</span>
                ) : (
                  referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "approved").map(ref => (
                    <div key={ref.id} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--success-bg)", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{ref.patientName} ({ref.age} yrs)</strong>
                        <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.62rem" }}>AMBULANCE EN ROUTE</span>
                      </div>
                      
                      {/* Vitals breakdown */}
                      {ref.vitals && (
                        <div style={{ display: "flex", gap: "8px", fontSize: "0.65rem", color: "var(--primary)", backgroundColor: "var(--primary-glow)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600 }}>
                          <span>💓 Pulse: {ref.vitals.pulse} BPM</span>
                          <span>🩸 BP: {ref.vitals.bp}</span>
                          <span>🫁 SpO2: {ref.vitals.spo2}%</span>
                        </div>
                      )}

                      <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                        📍 Patient GPS Locked • Target bed: {ref.bedType.toUpperCase()}
                      </div>

                      <button 
                        onClick={() => handleAdmitPatient(ref.id)}
                        className="btn btn-primary"
                        style={{ width: "100%", padding: "6px", fontSize: "0.7rem", backgroundColor: "var(--primary)", border: "none", color: "#ffffff", marginTop: "4px" }}
                      >
                        🏥 Confirm ER Arrival & Admit Patient
                      </button>
                    </div>
                  ))
                )
              )}

              {workflowTab === "admitted" && (
                (!referrals || referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "admitted").length === 0) ? (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>No currently admitted patients.</span>
                ) : (
                  referrals.filter(r => r.hospitalId === activeHospital.id && r.status === "admitted").map(ref => (
                    <div key={ref.id} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{ref.patientName} ({ref.age} yrs)</strong>
                        <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.62rem" }}>ADMITTED</span>
                      </div>
                      
                      {/* Vitals breakdown */}
                      {ref.vitals && (
                        <div style={{ display: "flex", gap: "8px", fontSize: "0.65rem", color: "var(--primary)", backgroundColor: "var(--primary-glow)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600 }}>
                          <span>💓 Pulse: {ref.vitals.pulse} BPM</span>
                          <span>🩸 BP: {ref.vitals.bp}</span>
                          <span>🫁 SpO2: {ref.vitals.spo2}%</span>
                        </div>
                      )}

                      <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                        Bed Class: {ref.bedType.toUpperCase()} | Check-in time: {ref.time}
                      </div>

                      <button 
                        onClick={() => handleDischargePatient(ref)}
                        className="btn btn-secondary"
                        style={{ width: "100%", padding: "6px", fontSize: "0.7rem", color: "var(--success)", marginTop: "4px" }}
                      >
                        🟢 Discharge Patient & Release Bed
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
          
          {/* AI-powered Insights Panel */}
          <div className="glass" style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            background: "linear-gradient(135deg, var(--bg-card), var(--success-glow))"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.25rem" }}>🤖</span>
              <h4 style={{ fontWeight: 700, margin: 0 }}>MedResQ AI Healthcare Insights</h4>
            </div>
            
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.4 }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                <span>✨</span>
                <span><strong>Demand Forecast:</strong> Weekly cycle models project a 12% rise in ICU admissions tomorrow at 18:00 (Midweek cycle peaks). Recommendation: Keep 2 ICU beds on standby.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <span>✨</span>
                <span><strong>Ambulance Routing Optimization:</strong> Active transit metrics indicate Ring Road bypass route is saving an average of 4.5 minutes driving time today.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <span>✨</span>
                <span><strong>Resource Saturation Index:</strong> Current local occupancy load is at 62%. Overall warning status remains **Green (Healthy)**.</span>
              </div>
            </div>
          </div>

          {/* Alarms Status panel */}
          <div className="glass" style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} className="text-danger" style={{ color: "var(--danger)" }} />
              <h4 style={{ fontWeight: 700 }}>{t.lowAlerts}</h4>
            </div>

            {localAlerts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {localAlerts.map((alert, idx) => (
                  <div key={idx} style={{
                    backgroundColor: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    color: "var(--danger)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <AlertCircle size={16} />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {t.noAlerts}
              </p>
            )}
          </div>

          {/* Edit Profile Panel */}
          <div className="glass" style={{
            padding: "1.5rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <TrendingUp size={18} className="text-primary" />
              <h4 style={{ fontWeight: 700 }}>{t.editProfile}</h4>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label>{t.name}</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t.phone}</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t.address}</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
                <Save size={16} />
                <span>{t.saveBtn}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Emergency Requests Referral Queue (Government / Admin Dashboard exclusive) */}
      <div className="glass" style={{
        padding: "1.5rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <Activity size={18} className="text-danger" style={{ color: "var(--danger)" }} />
          <h4 style={{ fontWeight: 700, margin: 0 }}>Active Emergency Referral & Ambulance Dispatch Log</h4>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {referrals.map((ref) => (
            <div key={ref.id} className="glass" style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: ref.status === "accepted" ? "1.5px solid var(--success-border)" : "1.5px solid var(--warning-border)",
              backgroundColor: ref.status === "accepted" ? "var(--success-bg)" : "var(--warning-bg)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{ref.patientName} (Age: {ref.age})</strong>
                <span style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: ref.status === "accepted" ? "var(--success)" : "var(--warning)",
                  color: "#ffffff"
                }}>
                  {ref.status}
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                Condition: <strong>{ref.condition}</strong><br/>
                ETA: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{ref.eta}</span>
              </p>
              {ref.status === "pending" && (
                <button className="btn btn-primary" style={{ backgroundColor: "var(--primary)", border: "none", fontSize: "0.7rem", padding: "6px 12px", alignSelf: "flex-start", marginTop: "4px" }} onClick={() => handleAcceptReferral(ref.id)}>
                  Accept Referral & Hold Bed
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
