import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import MapView from "./components/MapView";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import EmergencyDashboard from "./components/EmergencyDashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import NotificationToast from "./components/NotificationToast";
import AuthModal from "./components/AuthModal";
import { getInitialHospitals, saveHospitals, simulateOccupancyChanges, relocateHospitalsToCenter, getDynamicAddress } from "./utils/mockData";
import { checkCapacityAlerts as runAlertAudit } from "./utils/demandPredictor";

export default function App() {
  const [hospitals, setHospitals] = useState(getInitialHospitals);
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
  const [notifications, setNotifications] = useState([
    { id: "init_1", text: "MedResQ Metro ICU capacity warning active", time: "1m ago", unread: true },
    { id: "init_2", text: "MedResQ Rescue 1 dispatched to Central Sector", time: "4m ago", unread: true },
    { id: "init_3", text: "Emergency SOS response coordinates locked", time: "12m ago", unread: false }
  ]);
  const [referrals, setReferrals] = useState(() => {
    try {
      const stored = localStorage.getItem("medresq_referrals");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("medresq_referrals", JSON.stringify(referrals));
  }, [referrals]);

  const [ambulances, setAmbulances] = useState([
    { id: "AMB_001", lat: 28.5800, lng: 77.2200, name: "MedResQ Rescue 1 (ALS)", targetHospitalId: "HOSP_001", status: "transit", speed: 0.0008 },
    { id: "AMB_002", lat: 28.6000, lng: 77.3500, name: "MedResQ Rescue 2 (BLS)", targetHospitalId: "HOSP_002", status: "standby", speed: 0 },
    { id: "AMB_003", lat: 28.4800, lng: 77.4500, name: "MedResQ Rescue 3 (ALS)", targetHospitalId: "HOSP_003", status: "transit", speed: 0.001 }
  ]);

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

  // Auto-audit capacity triggers on startup
  useEffect(() => {
    const startupAlerts = runAlertAudit(hospitals);
    if (startupAlerts.length > 0) {
      setToasts(startupAlerts.slice(0, 3)); // Display up to 3 alerts initially
    }
  }, []);

  // Sync hospitals changes to localStorage
  const handleUpdateHospital = (updatedHospital) => {
    const updatedList = hospitals.map(h => h.id === updatedHospital.id ? updatedHospital : h);
    setHospitals(updatedList);
    saveHospitals(updatedList);

    // If the updated hospital is the currently selected one, update details
    if (selectedHospital && selectedHospital.id === updatedHospital.id) {
      setSelectedHospital(updatedHospital);
    }

    // Immediately run capacity check on change
    const newAlerts = runAlertAudit(updatedList);
    const existingIds = toasts.map(t => t.id);
    const freshAlerts = newAlerts.filter(a => !existingIds.includes(a.id));
    if (freshAlerts.length > 0) {
      setToasts(prev => [...prev, ...freshAlerts].slice(-3)); // Keep last 3 toasts
    }
  };

  // Real-Time Simulator Runner
  useEffect(() => {
    const interval = setInterval(() => {
      const { updatedHospitals, hasChanges } = simulateOccupancyChanges(hospitals);
      
      if (hasChanges) {
        setHospitals(updatedHospitals);
        saveHospitals(updatedHospitals);

        // Update selected hospital references if occupancy changed
        if (selectedHospital) {
          const matchingUpdated = updatedHospitals.find(h => h.id === selectedHospital.id);
          if (matchingUpdated) {
            setSelectedHospital(matchingUpdated);
          }
        }

        // Audit for new capacity alarms
        const newAlarms = runAlertAudit(updatedHospitals);
        if (newAlarms.length > 0) {
          setToasts(prev => {
            const existingIds = prev.map(t => t.id);
            // Only add alarms that are not currently displayed
            const uniqueNewAlarms = newAlarms.filter(a => !existingIds.includes(a.id));
            if (uniqueNewAlarms.length > 0) {
              return [...prev, ...uniqueNewAlarms].slice(-3); // Keep last 3 toasts
            }
            return prev;
          });

          setNotifications(prev => {
            const existingIds = prev.map(n => n.id);
            const freshNotifications = newAlarms
              .filter(a => !existingIds.includes(a.id))
              .map(a => ({
                id: a.id,
                text: a.message,
                time: "Just now",
                unread: true
              }));
            if (freshNotifications.length > 0) {
              return [...freshNotifications, ...prev];
            }
            return prev;
          });
        }
      }

      // Animate moving ambulances towards their target hospitals
      setAmbulances(prevAmbs => {
        return prevAmbs.map(amb => {
          if (amb.status !== "transit") {
            // Randomly dispatch standby ambulance to a target hospital
            if (Math.random() < 0.15) {
              const randomHosp = hospitals[Math.floor(Math.random() * hospitals.length)];
              return {
                ...amb,
                targetHospitalId: randomHosp.id,
                status: "transit",
                speed: 0.0008 + Math.random() * 0.0008
              };
            }
            return amb;
          }

          const targetHosp = hospitals.find(h => h.id === amb.targetHospitalId);
          if (!targetHosp) return amb;

          // Lat/Lng delta
          const dLat = targetHosp.lat - amb.lat;
          const dLng = targetHosp.lng - amb.lng;
          const distance = Math.sqrt(dLat * dLat + dLng * dLng);

          if (distance <= amb.speed) {
            // Arrived! Dispatch toast notification
            setToasts(prev => [
              ...prev,
              {
                id: `ARR_${Date.now()}_${amb.id}`,
                message: `🚨 ${amb.name} arrived at ${targetHosp.name}. Patient check-in successfully processed.`,
                type: "success"
              }
            ].slice(-3));

            setNotifications(prev => [
              {
                id: `ARR_${Date.now()}_${amb.id}`,
                text: `${amb.name} arrived at ${targetHosp.name}. Check-in processed.`,
                time: "Just now",
                unread: true
              },
              ...prev
            ]);

            return {
              ...amb,
              lat: targetHosp.lat,
              lng: targetHosp.lng,
              status: "standby",
              speed: 0
            };
          } else {
            // Interpolate coordinate position
            const ratio = amb.speed / distance;
            return {
              ...amb,
              lat: amb.lat + dLat * ratio,
              lng: amb.lng + dLng * ratio
            };
          }
        });
      });
    }, 8000); // Pulse every 8 seconds

    return () => clearInterval(interval);
  }, [hospitals, selectedHospital, toasts]);

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

  const isFirstRender = useRef(true);

  // Prepend notification when SOS is triggered
  useEffect(() => {
    if (sosActive) {
      setNotifications(prev => [
        {
          id: `sos_${Date.now()}`,
          text: "🚨 CRITICAL: SOS Emergency Broadcast Active - GPS Coordinates Shared!",
          time: "Just now",
          unread: true
        },
        ...prev
      ]);
    }
  }, [sosActive]);

  // Prepend notification when Disaster Mode is toggled
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setNotifications(prev => [
      {
        id: `disaster_${Date.now()}`,
        text: disasterMode 
          ? "⚠️ MUNICIPAL WARNING: City-wide Disaster Mode Activated by Health Officer!"
          : "🟢 INFO: Municipal Disaster Mode deactivated. Standard operating limits restored.",
        time: "Just now",
        unread: true
      },
      ...prev
    ]);
  }, [disasterMode]);

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
            setSosActive={setSosActive}
            disasterMode={disasterMode}
            setDisasterMode={setDisasterMode}
            referrals={referrals}
            setReferrals={setReferrals}
            gpsOrigin={gpsOrigin}
          />
        );
      case "admin":
        return (
          <AdminPortal
            hospitals={filteredHospitals}
            onUpdateHospital={handleUpdateHospital}
            lang={lang}
            referrals={referrals}
            setReferrals={setReferrals}
            setNotifications={setNotifications}
            onClose={() => {
              window.location.hash = "";
              setActiveTab("patient");
            }}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
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

  return (
    <div className="app-container">
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
          setNotifications={setNotifications}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
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
        onLoginSuccess={setCurrentUser}
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
