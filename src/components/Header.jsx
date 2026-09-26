import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Ambulance, BarChart3, Sun, Moon, Bell, User, MapPin, Zap } from "lucide-react";

export default function Header({ activeTab, setActiveTab, isDark, setIsDark, lang, setLang, alarmCount, notifications, setNotifications, selectedRegion, setSelectedRegion, currentUser, setCurrentUser, setShowAuthModal }) {
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };



  return (
    <header className="header-bar glass" style={{ position: "relative", zIndex: 1000 }}>
      {/* Brand Logo */}
      <div className="header-brand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          position: "relative",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "var(--primary-glow)",
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="animate-heartbeat"
            style={{ color: "var(--primary)" }}
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "var(--success)",
            border: "2px solid var(--surface)"
          }}></span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.025em", margin: 0 }}>
            {lang === "en" ? "MedResQ Health" : "मेडरेस्क्यू हेल्थ"}
          </h1>
          <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {lang === "en" ? "Serious Care Bed Admission & ICU Registry" : "गंभीर रोगी बेड आवंटन और आईसीयू रजिस्ट्री"}
          </span>
        </div>
      </div>



      {/* Top Right Controls & Metadata */}
      <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        
        {/* Region Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-hover)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)" }}>
          <MapPin size={12} className="text-primary" />
          <select 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", cursor: "pointer", outline: "none" }}
          >
            <option value="Delhi NCR">Delhi NCR</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Noida">Noida</option>
            <option value="Greater Noida">Greater Noida</option>
          </select>
        </div>

        {/* Live ticking Clock */}
        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
          🕒 {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        {/* Notifications Center */}
        <div style={{ position: "relative" }}>
          <button 
            className="btn btn-secondary btn-icon-only" 
            style={{ position: "relative" }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
          >
            <Bell size={18} />
            {notifications && notifications.filter(n => n.unread).length > 0 && (
              <span style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                backgroundColor: "var(--danger)",
                color: "#ffffff",
                fontSize: "0.6rem",
                fontWeight: 700,
                borderRadius: "50%",
                width: "14px",
                height: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {notifications.filter(n => n.unread).length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="glass" style={{
              position: "absolute",
              top: "42px",
              right: 0,
              width: "280px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              backgroundColor: "var(--surface)",
              zIndex: 1010
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Notifications Center</span>
                <button 
                  style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                >
                  Mark all read
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {!notifications || notifications.length === 0 ? (
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", padding: "10px" }}>No alerts</span>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px", borderRadius: "6px", backgroundColor: notif.unread ? "var(--primary-glow)" : "transparent", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "85%" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.3 }}>{notif.text}</span>
                        <span style={{ fontSize: "0.55rem", color: "var(--text-secondary)" }}>{notif.time}</span>
                      </div>
                      <button 
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer" }}
                        onClick={() => setNotifications(prev => prev.filter(item => item.id !== notif.id))}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Language selector */}
        <div className="multilingual-toggle" style={{ margin: 0 }}>
          <button 
            className={`lang-btn ${lang === "en" ? "active" : ""}`} 
            onClick={() => setLang("en")}
            style={{ padding: "4px 8px", fontSize: "0.7rem" }}
          >
            EN
          </button>
          <button 
            className={`lang-btn ${lang === "hi" ? "active" : ""}`} 
            onClick={() => setLang("hi")}
            style={{ padding: "4px 8px", fontSize: "0.7rem" }}
          >
            HI
          </button>
        </div>

        {/* Theme toggle */}
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary btn-icon-only"
          style={{ width: "32px", height: "32px", padding: 0 }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User profile avatar switcher */}
        {currentUser ? (
          <div style={{ position: "relative" }}>
            <button 
              className="btn btn-primary"
              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px", borderRadius: "20px" }}
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
            >
              <User size={14} />
              <span>{currentUser.name}</span>
            </button>
            {showProfile && (
              <div className="glass" style={{
                position: "absolute",
                top: "42px",
                right: 0,
                width: "180px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                backgroundColor: "var(--surface)",
                zIndex: 1010
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {currentUser.role === "admin" ? (lang === "hi" ? "अस्पताल व्यवस्थापक" : "Hospital Admin") : (lang === "hi" ? "पंजीकृत मरीज" : "Registered Patient")}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                  {currentUser.email}
                </div>
                {currentUser.role === "admin" && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: "0.65rem", padding: "4px 8px", width: "100%" }}
                    onClick={() => {
                      setShowProfile(false);
                      window.location.hash = "admin";
                    }}
                  >
                    Control Panel
                  </button>
                )}
                <button 
                  className="btn btn-danger" 
                  style={{ fontSize: "0.65rem", padding: "4px 8px", width: "100%", backgroundColor: "var(--danger)", border: "none", color: "#ffffff", fontWeight: 700 }}
                  onClick={() => {
                    setCurrentUser(null);
                    setShowProfile(false);
                    if (window.location.hash === "#admin" || window.location.hash === "#/admin") {
                      window.location.hash = "";
                    }
                  }}
                >
                  {lang === "hi" ? "लॉगआउट" : "Logout"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="btn btn-primary"
            style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
            onClick={() => setShowAuthModal(true)}
          >
            <User size={14} />
            <span>{lang === "hi" ? "लॉगिन करें" : "Sign In"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
