import React, { useState } from "react";
import { AlertCircle, Ambulance, Navigation, ArrowUpRight, CheckCircle, ShieldAlert, Compass, X } from "lucide-react";
import { calculateDistance, calculateDuration } from "./PatientPortal";
import { getDynamicAddress } from "../utils/mockData";

export default function EmergencyDashboard({ hospitals, selectedHospital, onSelectHospital, lang, userCoords, setUserCoords, isTrackingGPS, setIsTrackingGPS, gpsOrigin }) {
  const baseLat = gpsOrigin?.lat || 28.6139;
  const baseLng = gpsOrigin?.lng || 77.2090;

  const PRESETS = [
    { name: "Current Location", lat: baseLat, lng: baseLng },
    { name: "Sector Alpha (1.5 km North)", lat: baseLat + 0.012, lng: baseLng },
    { name: "Sector Beta (2.5 km South)", lat: baseLat - 0.022, lng: baseLng },
    { name: "East Sector (4.0 km East)", lat: baseLat, lng: baseLng + 0.038 },
    { name: "West Gate (6.0 km West)", lat: baseLat, lng: baseLng - 0.055 }
  ];

  const [triageCase, setTriageCase] = useState("all");
  const [isRouting, setIsRouting] = useState(false);
  const [transportMode, setTransportMode] = useState("ambulance");

  // Translations
  const trans = {
    en: {
      title: "Ambulance Emergency Dispatch Dashboard",
      caseSelector: "Active Triage Case Priority",
      distance: "Distance",
      duration: "Est. Duration",
      routeBtn: "Initialize Routing",
      activeRoute: "Active Route Directions",
      selectPrompt: "Select a hospital to establish dispatch routing.",
      priorityLabel: "Priority Indicators",
      icuBeds: "ICU Beds",
      vents: "Ventilator Beds",
      dispatchCenter: "Dispatch Station Position",
      presetText: "Relocate dispatch ambulance coordinates to recalculate emergency transit details:",
      mapNotice: "Tip: Click map directly to dispatch from coordinates!"
    },
    hi: {
      title: "एम्बुलेंस आपातकालीन प्रेषण डैशबोर्ड",
      caseSelector: "सक्रिय ट्राइएज केस प्राथमिकता",
      distance: "दूरी",
      duration: "अनुमानित समय",
      routeBtn: "मार्गदर्शन शुरू करें",
      activeRoute: "सक्रिय मार्ग निर्देश",
      selectPrompt: "प्रेषण मार्ग स्थापित करने के लिए एक hospital का चयन करें।",
      priorityLabel: "प्राथमिकता संकेतक",
      icuBeds: "आईसीयू बेड",
      vents: "वेंटिलेटर बेड",
      dispatchCenter: "प्रेषण स्टेशन की स्थिति",
      presetText: "आपातकालीन पारगमन विवरण की पुनर्गणना करने के लिए प्रेषण एम्बुलेंस निर्देशांक स्थानांतरित करें:",
      mapNotice: "सुझाव: निर्देशांक से भेजने के लिए सीधे मानचित्र पर क्लिक करें!"
    }
  };

  const t = trans[lang] || trans.en;

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setIsTrackingGPS(false);
    
    if (val === "Current Location") {
      setIsTrackingGPS(true);
      setUserCoords({ 
        lat: baseLat, 
        lng: baseLng, 
        name: getDynamicAddress(baseLat, baseLng),
        accuracy: 100,
        speed: "0.0",
        heading: "NE",
        lastUpdated: new Date().toLocaleTimeString()
      });
      return;
    }

    const matchedPreset = PRESETS.find(p => p.name === val);
    if (matchedPreset) {
      setUserCoords({
        lat: matchedPreset.lat,
        lng: matchedPreset.lng,
        name: getDynamicAddress(matchedPreset.lat, matchedPreset.lng),
        accuracy: 100,
        speed: "0.0",
        heading: "NE",
        lastUpdated: new Date().toLocaleTimeString()
      });
    }
  };

  // Filter and sort hospitals
  // For emergency cases, we only consider hospitals with beds of matching types
  const filteredHospitals = hospitals
    .map(hospital => {
      const dist = calculateDistance(userCoords.lat, userCoords.lng, hospital.lat, hospital.lng);
      const duration = calculateDuration(dist);
      
      let isCapable = true;
      let alertLevel = "Normal";

      if (triageCase === "cardiac" || triageCase === "trauma") {
        isCapable = hospital.beds.icu.available > 0;
        alertLevel = hospital.beds.icu.available <= 1 ? "low" : "high";
      } else if (triageCase === "respiratory") {
        isCapable = hospital.beds.ventilator.available > 0;
        alertLevel = hospital.beds.ventilator.available === 0 ? "low" : "high";
      }

      return {
        ...hospital,
        distance: dist,
        duration: duration,
        isCapable,
        alertLevel
      };
    })
    .filter(h => h.isCapable)
    // Sort by distance (closest first)
    .sort((a, b) => a.distance - b.distance);

  const bestOption = filteredHospitals[0];

  const handleRouteClick = () => {
    setIsRouting(true);
    setTimeout(() => {
      setIsRouting(false);
    }, 4000);
  };

  const isPresetActive = PRESETS.some(p => Math.abs(p.lat - userCoords.lat) < 0.0001 && Math.abs(p.lng - userCoords.lng) < 0.0001);

  return (
    <div className="split-pane">
      {/* Primary Left List View */}
      <div className="pane-primary">
        
        {/* Dispatch Location Selector */}
        <div className="glass" style={{ padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Compass size={14} className="text-primary" />
              <span>{t.dispatchCenter}</span>
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700 }}>
              📍 {userCoords.name === "Current Location" ? (lang === "hi" ? "वर्तमान स्थान" : "Current Location") : userCoords.name}
            </span>
          </div>
          
          <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.3 }}>
            {t.presetText}
          </p>
 
          <select 
            className="select-filter" 
            style={{ width: "100%", padding: "0.4rem 2rem 0.4rem 0.75rem", fontSize: "0.8rem" }}
            value={PRESETS.find(p => Math.abs(p.lat - userCoords.lat) < 0.0001 && Math.abs(p.lng - userCoords.lng) < 0.0001)?.name || "custom"}
            onChange={handlePresetChange}
          >
            <option value="Current Location">📍 {lang === "hi" ? "वर्तमान स्थान" : "Current Location"}</option>
            {PRESETS.slice(1).map((p, idx) => (
              <option key={idx} value={p.name}>{p.name}</option>
            ))}
            {!isPresetActive && (
              <option value="custom">📍 Custom Pin: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</option>
            )}
          </select>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", margin: "4px 0" }}>
            <span style={{ color: "var(--text-secondary)" }}>GPS Tracking Mode:</span>
            {isTrackingGPS ? (
              <span style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)", display: "inline-block", boxShadow: "0 0 6px var(--success)" }}></span> Active
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                Paused (Manual)
              </span>
            )}
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ fontSize: "0.75rem", padding: "6px 12px", display: "flex", gap: "4px", width: "100%", justifyContent: "center", textDecoration: "none" }}
            onClick={() => {
              setIsTrackingGPS(true);
            }}
          >
            <span>{lang === "hi" ? "मेरा स्थान खोजें (GPS)" : "Detect My GPS Location"}</span>
          </button>
          
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: "4px", marginTop: "2px" }}>
            {t.mapNotice}
          </div>
        </div>

        {/* Transport Mode Selector */}
        <div className="glass" style={{ padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Select Transport Mode
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button 
              className={`btn ${transportMode === "ambulance" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTransportMode("ambulance")}
              style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", padding: "6px" }}
            >
              <Ambulance size={13} />
              <span>Ambulance Dispatch</span>
            </button>
            <button 
              className={`btn ${transportMode === "own" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTransportMode("own")}
              style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", padding: "6px" }}
            >
              <span>🚗 Own Vehicle</span>
            </button>
          </div>
        </div>

        {/* Triage Case Buttons */}
        <div className="glass" style={{ padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
            {t.caseSelector}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
            <button 
              className={`btn ${triageCase === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTriageCase("all")}
            >
              <span>{lang === "hi" ? "सामान्य परिवहन" : "Standard Case"}</span>
            </button>
            <button 
              className={`btn ${triageCase === "cardiac" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setTriageCase("cardiac")}
              style={{
                borderColor: triageCase === "cardiac" ? "var(--danger)" : "var(--border)",
                backgroundColor: triageCase === "cardiac" ? "var(--danger)" : "transparent",
                color: triageCase === "cardiac" ? "#ffffff" : "var(--danger)"
              }}
            >
              <AlertCircle size={14} />
              <span>{lang === "hi" ? "हृदय गति रुकना (ICU)" : "Cardiac Arrest"}</span>
            </button>
            <button 
              className={`btn ${triageCase === "respiratory" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setTriageCase("respiratory")}
              style={{
                borderColor: triageCase === "respiratory" ? "var(--danger)" : "var(--border)",
                backgroundColor: triageCase === "respiratory" ? "var(--danger)" : "transparent",
                color: triageCase === "respiratory" ? "#ffffff" : "var(--danger)"
              }}
            >
              <AlertCircle size={14} />
              <span>{lang === "hi" ? "श्वसन विफलता (वेंटिलेटर)" : "Respiratory Failure"}</span>
            </button>
            <button 
              className={`btn ${triageCase === "trauma" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setTriageCase("trauma")}
              style={{
                borderColor: triageCase === "trauma" ? "var(--danger)" : "var(--border)",
                backgroundColor: triageCase === "trauma" ? "var(--danger)" : "transparent",
                color: triageCase === "trauma" ? "#ffffff" : "var(--danger)"
              }}
            >
              <AlertCircle size={14} />
              <span>{lang === "hi" ? "गंभीर आघात (ICU)" : "Critical Trauma"}</span>
            </button>
          </div>
        </div>

        {/* Highlight Recommended Hospital Pin */}
        {bestOption && triageCase !== "all" && (
          <div className="emergency-route-header">
            <Ambulance size={18} />
            <span>
              {lang === "hi" ? `अनुशंसित अस्पताल: ${bestOption.name}` : `Optimal Match Found: ${bestOption.name}`} 
              ({bestOption.distance} km - {bestOption.duration} min)
            </span>
          </div>
        )}

        {/* Listings */}
        <div className="hospital-list">
          {filteredHospitals.map((hospital, idx) => {
            const isSelected = selectedHospital && selectedHospital.id === hospital.id;
            const isBest = idx === 0 && triageCase !== "all";

            return (
              <div 
                key={hospital.id}
                className={`hospital-card ${isSelected ? 'selected' : ''}`}
                style={{
                  borderLeft: isBest ? "4px solid var(--danger)" : "1px solid var(--border)"
                }}
                onClick={() => onSelectHospital(hospital)}
              >
                <div className="hospital-card-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="hospital-name">{hospital.name}</span>
                    {isBest && (
                      <span className="emergency-badge">
                        {lang === "hi" ? "अनुशंसित" : "Primary"}
                      </span>
                    )}
                  </div>
                  <div className="hospital-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Navigation size={12} />
                      {hospital.distance} km
                    </span>
                    <span>
                      {t.icuBeds}: {hospital.beds.icu.available} | {t.vents}: {hospital.beds.ventilator.available}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div>{hospital.duration} min</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{lang === "hi" ? "ड्राइव का समय" : "drive time"}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-secondary" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details / Routing Panel */}
      <div className="pane-secondary">
        {selectedHospital ? (
          <>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: "1px solid var(--border)", paddingBottom: '12px' }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Ambulance size={18} className="text-primary" />
                <h4 style={{ fontWeight: 700 }}>{t.activeRoute}</h4>
              </div>
              <button 
                onClick={() => onSelectHospital(null)} 
                className="btn btn-secondary btn-icon-only" 
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'none'
                }}
                title="Close Route / Show All on Map"
              >
                <X size={18} />
              </button>
            </div>

            <div className="panel-body">
              {/* Route Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="contact-info-block" style={{ alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.distance}</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {calculateDistance(userCoords.lat, userCoords.lng, selectedHospital.lat, selectedHospital.lng)} km
                  </strong>
                </div>
                <div className="contact-info-block" style={{ alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.duration}</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    {calculateDuration(calculateDistance(userCoords.lat, userCoords.lng, selectedHospital.lat, selectedHospital.lng))} min
                  </strong>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${selectedHospital.lat},${selectedHospital.lng}&travelmode=driving`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "6px", textDecoration: "none" }}
                >
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>Google Maps ↗</span>
                </a>
                <a 
                  href={`https://maps.apple.com/?saddr=${userCoords.lat},${userCoords.lng}&daddr=${selectedHospital.lat},${selectedHospital.lng}&dirflg=d`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "6px", textDecoration: "none" }}
                >
                  <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>Apple Maps ↗</span>
                </a>
              </div>

              {/* Simulated Navigation Steps */}
              <div>
                <span className="section-title">
                  {lang === "hi" ? "मार्गदर्शन निर्देश" : "Directions Step-by-Step"} ({transportMode === "own" ? "Personal Vehicle" : "Ambulance"})
                </span>
                <div className="route-step-list">
                  <div className="route-step active">
                    <div className="route-step-dot"></div>
                    <div className="route-step-desc">
                      <strong>
                        {transportMode === "own" 
                          ? (lang === "hi" ? "स्थान प्रस्थान" : "Start Location") 
                          : (lang === "hi" ? "प्रेषण केंद्र" : "Dispatch Center")}
                      </strong><br />
                      {transportMode === "own" 
                        ? (lang === "hi" ? "निजी कार में जीपीएस नेविगेशन शुरू करें" : "Initiate driving directions in personal car") 
                        : (lang === "hi" ? "एम्बुलेंस मुख्यालय से रवाना की गई" : "Ambulance dispatched from MedResQ HQ")}
                    </div>
                  </div>
                  <div className="route-step active">
                    <div className="route-step-dot"></div>
                    <div className="route-step-desc">
                      {transportMode === "own" 
                        ? (lang === "hi" ? "हजरतगंज मुख्य सड़क के मार्ग का अनुसरण करें" : "Drive via Hazratganj road towards destination") 
                        : (lang === "hi" ? "गोल्डन गेट एवेन्यू से 1.5 किमी आगे बढ़ें" : "Proceed 1.5 km via Golden Gate Ave")}
                    </div>
                  </div>
                  <div className="route-step active">
                    <div className="route-step-dot"></div>
                    <div className="route-step-desc">
                      {transportMode === "own" 
                        ? (lang === "hi" ? "मुख्य मार्ग संकेतकों का पालन करें" : "Follow intersection signs towards emergency entrance") 
                        : (lang === "hi" ? "स्टैनियन सेंट पर बाएं मुड़ें" : "Turn left onto Stanyan St")}
                    </div>
                  </div>
                  <div className="route-step danger">
                    <div className="route-step-dot"></div>
                    <div className="route-step-desc">
                      <strong>{selectedHospital.name}</strong><br />
                      {transportMode === "own" 
                        ? (lang === "hi" ? "आपातकालीन वाहन पार्किंग और रिसेप्शन पर पहुंचे" : "Arrive at Emergency parking / main clinic entrance") 
                        : (lang === "hi" ? "ईआर एम्बुलेंस बे पर पहुंचें" : "Arrive at ER ambulance bay")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-footer">
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={handleRouteClick}
                disabled={isRouting}
              >
                {isRouting ? (
                  <>
                    <CheckCircle size={16} />
                    <span>{lang === "hi" ? "मार्ग की गणना की जा रही है..." : "Calculating Route..."}</span>
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    <span>
                      {transportMode === "own" 
                        ? (lang === "hi" ? "निजी नेविगेशन शुरू करें" : "Start Private Driving") 
                        : t.routeBtn}
                    </span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px" }}>
            <Navigation size={32} />
            <span>{t.selectPrompt}</span>
          </div>
        )}
      </div>
    </div>
  );
}
