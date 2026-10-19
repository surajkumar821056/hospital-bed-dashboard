import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import MapView from "./components/MapView";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import EmergencyDashboard from "./components/EmergencyDashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import NotificationToast from "./components/NotificationToast";
import AuthModal from "./components/AuthModal";
import { getDynamicAddress } from "./utils/mockData";
import { api } from "./api/client";
import { checkCapacityAlerts as runAlertAudit } from "./utils/demandPredictor";

export default function App() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [activeTab, setActiveTab] = useState("patient");
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState("en");
  const [toasts, setToasts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("Delhi NCR");
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userCoords, setUserCoords] = useState({ 
    lat: 28.6139, 
    lng: 77.2090, 
    name: getDynamicAddress(28.6139, 77.2090),
    accuracy: 85,
    speed: "0.0",
    heading: "NE",
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [isTrackingGPS, setIsTrackingGPS] = useState(true);
  const [gpsOrigin, setGpsOrigin] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [disasterMode, setDisasterMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [sosRequests, setSosRequests] = useState([]);
  const [sosId, setSosId] = useState(null);

  const refreshGeneration = useRef(0);
  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    await api.health();
    const [hospitalData, ambulanceData, state] = await Promise.all([api.hospitals(), api.ambulances(), api.system()]);
    let requests = [], notices = [], emergencies = [];
    if (api.hasSession()) {
      [requests, notices, emergencies] = await Promise.all([api.referrals(), api.notifications(), api.sosRequests()]);
    }
    if (generation !== refreshGeneration.current) return;
    setHospitals(hospitalData);
    setSelectedHospital(prev => prev ? hospitalData.find(h => h.id === prev.id) || null : null);
    setAmbulances(ambulanceData); setDisasterMode(state.disasterMode);
    setReferrals(requests); setNotifications(notices); setSosRequests(emergencies);
    const active = emergencies.find(s => ["pending", "acknowledged"].includes(s.status) && s.owner === currentUser?.email);
    setSosId(active?.id || null); setSosActive(Boolean(active));
    setBackendReady(true); setBackendError("");
  }, [currentUser]);

  useEffect(() => {
    const expired = () => setCurrentUser(null);
    window.addEventListener('medresq-session-expired', expired);
    if (api.hasSession()) api.me().then(setCurrentUser).catch(() => setCurrentUser(null));
    return () => window.removeEventListener('medresq-session-expired', expired);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => refresh().catch(error => { if (active) setBackendError(error.message); });
    load();
    const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]);

  const handleCurrentUser = async user => {
    if (!user) {
      try { await api.logout(); } catch (error) { setBackendError(error.message); }
      setReferrals([]); setNotifications([]);
    }
    ++refreshGeneration.current;
    setCurrentUser(user);
  };

  const handleCreateBooking = async booking => {
    const created = await api.book(booking);
    setReferrals(prev => [created, ...prev]);
    await refresh();
    return created;
  };

  const handleTransition = async (id, status) => {
    await api.transition(id, status);
    await refresh();
  };

  const handleSos = async value => {
    try {
      if (value) { const record = await api.sos(userCoords); setSosId(record.id); }
      else if (sosId) await api.cancelSos(sosId);
      setSosActive(value);
      await refresh();
    } catch (error) { setBackendError(error.message); }
  };

  const handleDisaster = async value => {
    try { const state = await api.disaster(value); setDisasterMode(state.disasterMode); await refresh(); }
    catch (error) { setBackendError(error.message); }
  };

  const handleNotifications = updater => {
    const next = typeof updater === 'function' ? updater(notifications) : updater;
    const changed = notifications.filter(n => n.unread && (!next.find(item => item.id === n.id)?.unread));
    Promise.all(changed.map(n => api.readNotice(n.id))).then(refresh).catch(error => setBackendError(error.message));
    setNotifications(next);
  };

  // Splash Screen timer on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for hash-based routing to load secret Admin Portal
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#admin") {
        setActiveTab("admin");
      } else if (window.location.hash === "#patient" || window.location.hash === "") {
        setActiveTab("patient");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Hospitals are fixed to their real, geographically accurate Delhi NCR coordinates.
  // This allows users to view them in their real coordinates on the Leaflet map.

  // Live GPS tracking watcher in real-time
  useEffect(() => {
    let watchId = null;
    let intervalId = null;

    if (isTrackingGPS) {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser. Using generic fallback.");
        return;
      }

      // Explicitly request initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateCoords(position);
        },
        (error) => {
          handleGPSError(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      // Start watching coordinates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateCoords(position);
        },
        (error) => {
          handleGPSError(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      // Poll GPS coordinates every 2 seconds to guarantee responsiveness
      intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            updateCoords(position);
          },
          (error) => {
            console.warn("Periodic interval GPS poll error:", error.message);
          },
          { enableHighAccuracy: true, timeout: 2000, maximumAge: 0 }
        );
      }, 2000);
    }

    function updateCoords(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy || 15;
      const speed = position.coords.speed !== null ? (position.coords.speed * 3.6).toFixed(1) : "0.0";
      const heading = position.coords.heading !== null ? `${position.coords.heading.toFixed(0)}°` : "NE";
      setUserCoords({ 
        lat, 
        lng, 
        name: getDynamicAddress(lat, lng),
        accuracy,
        speed,
        heading,
        lastUpdated: new Date().toLocaleTimeString()
      });
      setGpsOrigin(prev => prev ? prev : { lat, lng });
    }

    function handleGPSError(error) {
      let errorMsg = "";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = "GPS Permission Denied. Please enable location access in settings. Falling back to default center.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = "GPS Location unavailable. Falling back to default center.";
          break;
        case error.TIMEOUT:
          errorMsg = "GPS Request timed out. Falling back to default center.";
          break;
        default:
          errorMsg = "GPS Error occurred. Falling back to default center.";
      }
      
      console.warn(errorMsg, error.message);
      
      // Fallback coordinates (Generic)
      setUserCoords(prev => ({ 
        ...prev,
        lat: 28.6139, 
        lng: 77.2090, 
        name: getDynamicAddress(28.6139, 77.2090),
        accuracy: 100,
        speed: "0.0",
        heading: "NE",
        lastUpdated: new Date().toLocaleTimeString()
      }));
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [isTrackingGPS]);

  const handleUpdateHospital = async updatedHospital => {
    const saved = await api.updateHospital(updatedHospital);
    await refresh();
    const alerts = runAlertAudit([saved]);
    if (alerts.length) setToasts(alerts.slice(-3));
    return saved;
  };

  // Toast Auto-Dismissal
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        // Dismiss first toast
        setToasts(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const handleDismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const filteredHospitals = hospitals.filter(h => {
    if (selectedRegion === "Delhi NCR") return true;
    if (selectedRegion === "New Delhi") return h.address.includes("New Delhi") || h.address.includes("Delhi");
    if (selectedRegion === "Noida") return h.address.includes("Noida") && !h.address.includes("Greater Noida");
    if (selectedRegion === "Greater Noida") return h.address.includes("Greater Noida");
    return true;
  });

  const activeAlarms = runAlertAudit(filteredHospitals);

  const renderActivePortal = () => {
    switch (activeTab) {
      case "patient":
        return (
          <PatientPortal
            hospitals={filteredHospitals}
            selectedHospital={selectedHospital}
            onSelectHospital={setSelectedHospital}
            lang={lang}
            userCoords={userCoords}
            setUserCoords={setUserCoords}
            isTrackingGPS={isTrackingGPS}
            setIsTrackingGPS={setIsTrackingGPS}
            setActiveTab={setActiveTab}
            ambulances={ambulances}
            sosActive={sosActive}
            setSosActive={handleSos}
            disasterMode={disasterMode}
            setDisasterMode={handleDisaster}
            referrals={referrals}
            onCreateBooking={handleCreateBooking}
            currentUser={currentUser}
            onRequestLogin={() => setShowAuthModal(true)}
            gpsOrigin={gpsOrigin}
          />
        );
      case "admin":
        return (
          <AdminPortal
            hospitals={hospitals}
            onUpdateHospital={handleUpdateHospital}
            lang={lang}
            referrals={referrals}
            onTransition={handleTransition}
            sosRequests={sosRequests}
            onRefresh={refresh}
            onClose={() => {
              window.location.hash = "";
              setActiveTab("patient");
            }}
            currentUser={currentUser}
            setCurrentUser={handleCurrentUser}
          />
        );
      case "emergency":
        return (
          <EmergencyDashboard
            hospitals={filteredHospitals}
            selectedHospital={selectedHospital}
            onSelectHospital={setSelectedHospital}
            lang={lang}
            userCoords={userCoords}
            setUserCoords={setUserCoords}
            isTrackingGPS={isTrackingGPS}
            setIsTrackingGPS={setIsTrackingGPS}
            gpsOrigin={gpsOrigin}
          />
        );
      case "analytics":
        return (
          <AnalyticsDashboard
            hospitals={filteredHospitals}
            lang={lang}
          />
        );
      default:
        return null;
    }
  };

  // Check if map should be displayed side-by-side with portal content
  // Map is shown on Patient Portal and Emergency Portal for real-time tracking
  const showSplitLayout = activeTab === "patient" || activeTab === "emergency";

  if (showSplash) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        fontFamily: "var(--font-sans)",
        gap: "1.5rem"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#eff6ff",
          color: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.025em" }}>MedResQ Health</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "6px 0 0 0", fontWeight: 500 }}>Connecting Care. Saving Lives.</p>
          <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "8px 0 0 0" }}>by MedResQ Technologies</p>
        </div>
      </div>
    );
  }

  if (!backendReady) return <div style={{ padding: "3rem", textAlign: "center" }}>
    <h2>MedResQ Health</h2>
    <p>{backendError ? "Cannot connect to the backend: " + backendError : "Loading hospital records..."}</p>
    <p>Start the Java backend on port 8080.</p>
    <button className="btn btn-primary" onClick={() => refresh().catch(e => setBackendError(e.message))}>Retry</button>
  </div>;

  return (
    <div className="app-container">
      {backendError && <div role="alert" style={{ padding: "12px", background: "#fee2e2", color: "#991b1b" }}>
        {backendError}<button onClick={() => setBackendError("")} style={{ marginLeft: 12 }}>Dismiss</button>
      </div>}
      {activeTab !== "admin" && (
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedHospital(null); // Reset selection on tab switch
          }}
          isDark={isDark}
          setIsDark={setIsDark}
          lang={lang}
          setLang={setLang}
          alarmCount={activeAlarms.length}
          notifications={notifications}
          setNotifications={handleNotifications}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          currentUser={currentUser}
          setCurrentUser={handleCurrentUser}
          setShowAuthModal={setShowAuthModal}
        />
      )}

      {disasterMode && (
        <div className="sos-pulse-effect" style={{
          backgroundColor: "var(--danger)",
          color: "#ffffff",
          textAlign: "center",
          fontWeight: 900,
          fontSize: "0.8rem",
          padding: "8px",
          letterSpacing: "0.05em",
          zIndex: 999
        }}>
          🚨 MUNICIPAL DISASTER MODE ACTIVE - ALL EMERGENCY BED ROUTING PROTOCOLS PRIORITIZED 🚨
        </div>
      )}

      <main className="main-content">
        {showSplitLayout ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            height: "calc(100vh - 7rem)",
            minHeight: "550px"
          }} className="responsive-split">
            {/* Left Portal Console */}
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {renderActivePortal()}
            </div>
            
            {/* Right Map View */}
            <div style={{ height: "100%" }}>
              <MapView
                hospitals={filteredHospitals}
                selectedHospital={selectedHospital}
                onSelectHospital={setSelectedHospital}
                showRouting={activeTab === "emergency"}
                userCoords={userCoords}
                ambulances={ambulances}
                sosActive={sosActive}
                onMapClick={(lat, lng) => {
                  setIsTrackingGPS(false);
                  setUserCoords({ 
                    lat, 
                    lng, 
                    name: getDynamicAddress(lat, lng),
                    accuracy: 10,
                    speed: "0.0",
                    heading: "N",
                    lastUpdated: new Date().toLocaleTimeString()
                  });
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ minHeight: activeTab === "admin" ? "100vh" : "calc(100vh - 7rem)" }}>
            {renderActivePortal()}
          </div>
        )}
      </main>

      {/* Authentication Gateway Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleCurrentUser}
        lang={lang}
      />

      {/* Notification Toast Component */}
      <NotificationToast 
        toasts={toasts} 
        onDismiss={handleDismissToast} 
      />

      {/* CSS overrides for responsive layout grids */}
      <style>{`
        @media (max-width: 900px) {
          .responsive-split {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .responsive-split > div {
            height: 500px !important;
          }
        }
      `}</style>
    </div>
  );
}
