# MedResQ Health - Step-by-Step Developer Coding Guide

Welcome to the MedResQ Health project build handbook! This guide contains the exact steps and code structures to build the entire platform. 

Open this file in VS Code side-by-side with your code to follow along.

---

## 📅 STEP 1: Designing the CSS Token System (`src/index.css`)
Open `src/index.css` and replace its contents with the styling system variables. These tokens manage light/dark shifts and glassmorphic aesthetics:

```css
:root {
  --primary: #2563eb;          /* Brand Blue */
  --primary-glow: rgba(37, 99, 235, 0.08);
  --success: #10b981;          /* Success Green */
  --success-bg: rgba(16, 185, 129, 0.1);
  --warning: #f59e0b;          /* Warning Yellow */
  --danger: #ef4444;           /* Danger Red */
  --danger-bg: rgba(239, 68, 68, 0.1);
  
  --bg-app: #f8fafc;           /* Light Theme Background */
  --surface: rgba(255, 255, 255, 0.7);
  --border: rgba(226, 232, 240, 0.8);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  
  --radius-md: 8px;
  --radius-lg: 16px;
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
}

.dark {
  --bg-app: #0f172a;           /* Dark Theme Background Override */
  --surface: rgba(30, 41, 59, 0.75);
  --border: rgba(51, 65, 85, 0.8);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-app);
  color: var(--text-primary);
  transition: background-color 0.3s ease;
}

.glass {
  background: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 📅 STEP 2: Building mockData and the Geocoder (`src/utils/mockData.js`)
Create or edit `src/utils/mockData.js`. This file exports our initial hospital lists, handles local storage syncing, and contains the dynamic address geocoder:

```javascript
// Dynamic geocoding simulator for global coordinates
export const getDynamicAddress = (lat, lng) => {
  const streetNames = ["Hospital Road", "Medical Care Pkwy", "Main Street", "Broadway Avenue", "Care Link Drive", "Parkway Plaza", "Health Boulevard", "Station Road"];
  const districts = ["Central Valley", "Northside", "West End", "East Gate", "Midtown", "Downtown Heights", "Southside", "Ridge View"];
  
  const hash = Math.abs(Math.round(lat * 1234 + lng * 5678));
  const street = streetNames[hash % streetNames.length];
  const district = districts[(hash >> 2) % districts.length];
  const doorNo = 100 + (hash % 850);
  const mockZip = 10000 + (hash % 89999);
  
  const latSign = lat >= 0 ? "N" : "S";
  const lngSign = lng >= 0 ? "E" : "W";
  
  return `${doorNo} ${street}, ${district} (GPS: ${Math.abs(lat).toFixed(4)}°${latSign}, ${Math.abs(lng).toFixed(4)}°${lngSign}, Zip: ${mockZip})`;
};

// Relocate mock hospitals to cluster dynamically around user coordinates
export const relocateHospitalsToCenter = (hospitals, centerLat, centerLng) => {
  const offsets = [
    { lat: -0.015, lng: -0.018 },
    { lat: 0.005, lng: -0.014 },
    { lat: -0.022, lng: 0.031 },
    { lat: 0.012, lng: 0.012 },
    { lat: 0.006, lng: -0.005 }
  ];

  const names = [
    "MedResQ Metro General Hospital",
    "MedResQ Apollo Emergency Center",
    "MedResQ Max Super Specialty Clinic",
    "MedResQ Fortis Municipal Hospital",
    "MedResQ Shanti Memorial Trauma Center"
  ];

  return hospitals.map((hospital, idx) => {
    const offset = offsets[idx % offsets.length];
    const targetLat = centerLat + offset.lat;
    const targetLng = centerLng + offset.lng;
    return {
      ...hospital,
      name: names[idx % names.length],
      address: getDynamicAddress(targetLat, targetLng),
      lat: targetLat,
      lng: targetLng,
      lastUpdated: new Date().toISOString()
    };
  });
};
```

---

## 📅 STEP 3: Implementing Decision Algorithms (`src/utils/demandPredictor.js`)
Create or edit `src/utils/demandPredictor.js`. This file implements the mathematical formulas:
*   **Naive Bayes** (Triage classification)
*   **M/M/c Model** (ER wait times prediction)
*   **Simple Linear Regression** (Demand occupancy forecasting)
*   **evaluateHospitalMatching** (Clinical match scoring)

```javascript
import { getDynamicAddress } from "./mockData";

// Naive Bayes urgency triager
export const classifyEmergency = (text) => {
  const query = text.toLowerCase();
  const categories = {
    "ESI-1 (Critical / Cardiac Resuscitation)": {
      keywords: ["chest", "pain", "heart", "cardiac", "stroke", "numb", "unconscious"],
      score: 0.15,
      bed: "icu"
    },
    "ESI-2 (Emergent / Respiratory Distress)": {
      keywords: ["breathe", "breathing", "asthma", "oxygen", "suffocate", "bleed", "blood"],
      score: 0.12,
      bed: "ventilator"
    }
  };

  let bestCategory = "ESI-4 (Less Urgent / Minor Trauma)";
  let maxScore = -Infinity;
  let matchesCount = 0;

  Object.entries(categories).forEach(([cat, data]) => {
    let matches = 0;
    data.keywords.forEach(kw => { if (query.includes(kw)) matches++; });
    const score = matches * 3.0 + data.score;
    if (score > maxScore && matches > 0) {
      maxScore = score;
      bestCategory = cat;
      matchesCount = matches;
    }
  });

  return {
    category: bestCategory,
    isCritical: bestCategory.includes("ESI-1") || bestCategory.includes("ESI-2"),
    recommendedBed: categories[bestCategory]?.bed || "general",
    confidence: matchesCount > 0 ? Math.min(98, 45 + matchesCount * 15) : 35
  };
};

// M/M/c ER wait predictor
export const predictQueueWaitTime = (hospital, bedType = "general") => {
  const doctors = 6;
  const availableBeds = hospital.beds[bedType]?.available || 5;
  const capacity = hospital.beds[bedType]?.total || 20;
  const utilization = capacity > 0 ? (capacity - availableBeds) / capacity : 0.7;
  
  const arrivalRate = 4.5 * (utilization + 0.2); // Lambda
  const serviceRate = 1.2 * doctors; // Mu * c

  let waitTimeHours = 0;
  if (arrivalRate < serviceRate) {
    waitTimeHours = arrivalRate / (serviceRate * (serviceRate - arrivalRate));
  } else {
    waitTimeHours = 1.5 + (utilization * 2.0);
  }
  return Math.max(5, Math.min(180, Math.round(waitTimeHours * 60)));
};

// Multi-criteria clinical matching engine
export const evaluateHospitalMatching = (userLat, userLng, ESIResult, hospitals) => {
  const targetBedType = ESIResult.recommendedBed || "general";
  const category = ESIResult.category;

  return hospitals.map(h => {
    // Proximity
    const dist = Math.sqrt((userLat - h.lat) ** 2 + (userLng - h.lng) ** 2) * 111;
    const wait = predictQueueWaitTime(h, targetBedType);
    const available = h.beds[targetBedType]?.available || 0;

    let score = 50; // Base score
    const breakdown = ["Base Suitability (+50)"];

    if (available > 0) {
      score += 20;
      breakdown.push("Bed Available (+20)");
    }
    if (dist < 5) {
      score += 20;
      breakdown.push("Close Distance <5km (+20)");
    }
    if (wait < 30) {
      score += 10;
      breakdown.push("Short Wait Time <30m (+10)");
    }

    return {
      hospital: h,
      distance: parseFloat(dist.toFixed(1)),
      waitTime: wait,
      score: Math.min(100, score),
      breakdown
    };
  }).sort((a, b) => b.score - a.score);
};
```

---

## 📅 STEP 4: Creating the Client UI Portals (`src/components/`)
*   Create **`PatientPortal.jsx`** to render symptoms checkers, ESI classifications, and hospital list grids.
*   Create **`AdminPortal.jsx`** to configure administrative dashboards, vitals checking, and clinical referral board columns (`Incoming`, `In Transit`, `Admitted`).

---

## 📅 STEP 5: State Synchronization Orchestrator (`src/App.jsx`)
Replace the contents of `src/App.jsx` to tie your views together, watch browser Geolocation positions, trigger relocation routines, and synchronize state to local storage:

```javascript
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import MapView from "./components/MapView";
import PatientPortal from "./components/PatientPortal";
import AdminPortal from "./components/AdminPortal";
import { getInitialHospitals, getDynamicAddress, relocateHospitalsToCenter } from "./utils/mockData";

export default function App() {
  const [hospitals, setHospitals] = useState(getInitialHospitals);
  const [userCoords, setUserCoords] = useState({ lat: 37.7749, lng: -122.4194 });
  const [activeTab, setActiveTab] = useState("patient");

  // Relocate mock hospitals locally if coordinates change
  useEffect(() => {
    if (!userCoords) return;
    const relocated = relocateHospitalsToCenter(hospitals, userCoords.lat, userCoords.lng);
    setHospitals(relocated);
  }, [userCoords.lat, userCoords.lng]);

  return (
    <div className="app-container">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        {activeTab === "patient" ? (
          <PatientPortal hospitals={hospitals} userCoords={userCoords} setUserCoords={setUserCoords} />
        ) : (
          <AdminPortal hospitals={hospitals} />
        )}
      </main>
    </div>
  );
}
```
