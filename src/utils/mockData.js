// Mock Hospital Bed Availability Data

const DEFAULT_HOSPITALS = [
  {
    id: "HOSP_001",
    name: "AIIMS New Delhi",
    address: "Ansari Nagar, New Delhi, Delhi 110029",
    lat: 28.5672,
    lng: 77.2100,
    phone: "+91 11 2658 8500",
    email: "emergency@aiims.edu",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 150, available: 42 },
      icu: { total: 40, available: 4 },
      picu: { total: 20, available: 6 },
      nicu: { total: 25, available: 11 },
      ventilator: { total: 30, available: 3 },
      isolation: { total: 20, available: 8 }
    }
  },
  {
    id: "HOSP_002",
    name: "Safdarjung Hospital Delhi",
    address: "Ansari Nagar East, New Delhi, Delhi 110029",
    lat: 28.5684,
    lng: 77.2072,
    phone: "+91 11 2673 0000",
    email: "admin@safdarjunghospital.gov.in",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 100, available: 12 },
      icu: { total: 25, available: 2 },
      picu: { total: 10, available: 1 },
      nicu: { total: 15, available: 3 },
      ventilator: { total: 15, available: 1 },
      isolation: { total: 15, available: 2 }
    }
  },
  {
    id: "HOSP_003",
    name: "Max Super Speciality Hospital Saket",
    address: "Press Enclave Marg, Saket, New Delhi, Delhi 110017",
    lat: 28.5284,
    lng: 77.2114,
    phone: "+91 11 2651 5050",
    email: "info@maxhealthcare.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 80, available: 28 },
      icu: { total: 15, available: 8 },
      picu: { total: 5, available: 3 },
      nicu: { total: 10, available: 7 },
      ventilator: { total: 8, available: 4 },
      isolation: { total: 12, available: 5 }
    }
  },
  {
    id: "HOSP_004",
    name: "Fortis Hospital Noida",
    address: "B-22, Sector 62, Noida, Uttar Pradesh 201301",
    lat: 28.6189,
    lng: 77.3734,
    phone: "+91 120 430 0222",
    email: "contact@fortisnoida.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 120, available: 55 },
      icu: { total: 30, available: 12 },
      picu: { total: 15, available: 9 },
      nicu: { total: 20, available: 15 },
      ventilator: { total: 20, available: 8 },
      isolation: { total: 10, available: 7 }
    }
  },
  {
    id: "HOSP_005",
    name: "Sharda Hospital Greater Noida",
    address: "Plot 32, Knowledge Park III, Greater Noida, Uttar Pradesh 201306",
    lat: 28.4731,
    lng: 77.4828,
    phone: "+91 120 232 9700",
    email: "info@shardahospital.org",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 90, available: 8 },
      icu: { total: 20, available: 1 },
      picu: { total: 8, available: 0 },
      nicu: { total: 12, available: 2 },
      ventilator: { total: 10, available: 0 },
      isolation: { total: 8, available: 1 }
    }
  },
  {
    id: "HOSP_006",
    name: "Kailash Hospital Greater Noida",
    address: "Plot 23, Knowledge Park I, Greater Noida, Uttar Pradesh 201310",
    lat: 28.4789,
    lng: 77.4912,
    phone: "+91 120 232 7700",
    email: "kailash@kailashhospital.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 110, available: 45 },
      icu: { total: 25, available: 6 },
      picu: { total: 10, available: 4 },
      nicu: { total: 15, available: 9 },
      ventilator: { total: 12, available: 3 },
      isolation: { total: 10, available: 6 }
    }
  },
  {
    id: "HOSP_007",
    name: "Jaypee Hospital Noida",
    address: "Wish Town, Sector 128, Noida, Uttar Pradesh 201304",
    lat: 28.5147,
    lng: 77.3712,
    phone: "+91 120 412 2222",
    email: "emergency@jaypeehealthcare.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 130, available: 35 },
      icu: { total: 35, available: 14 },
      picu: { total: 12, available: 8 },
      nicu: { total: 18, available: 11 },
      ventilator: { total: 15, available: 7 },
      isolation: { total: 12, available: 9 }
    }
  },
  {
    id: "HOSP_008",
    name: "Medanta - The Medicity Gurugram",
    address: "Sector 38, Gurugram, Haryana 122001",
    lat: 28.4312,
    lng: 77.0425,
    phone: "+91 124 414 1414",
    email: "info@medanta.org",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 200, available: 48 },
      icu: { total: 50, available: 18 },
      picu: { total: 15, available: 5 },
      nicu: { total: 20, available: 12 },
      ventilator: { total: 25, available: 10 },
      isolation: { total: 15, available: 8 }
    }
  },
  {
    id: "HOSP_009",
    name: "Sir Ganga Ram Hospital New Delhi",
    address: "Sir Ganga Ram Hospital Marg, Rajinder Nagar, New Delhi, Delhi 110060",
    lat: 28.6382,
    lng: 77.1895,
    phone: "+91 11 2575 0000",
    email: "gangaram@sgrh.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 140, available: 22 },
      icu: { total: 30, available: 5 },
      picu: { total: 10, available: 3 },
      nicu: { total: 15, available: 8 },
      ventilator: { total: 15, available: 2 },
      isolation: { total: 12, available: 4 }
    }
  },
  {
    id: "HOSP_010",
    name: "Indraprastha Apollo Hospitals New Delhi",
    address: "Sarita Vihar, Delhi Mathura Road, New Delhi, Delhi 110076",
    lat: 28.5361,
    lng: 77.2861,
    phone: "+91 11 2987 1090",
    email: "apollo_delhi@apollohospitals.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 180, available: 40 },
      icu: { total: 45, available: 11 },
      picu: { total: 15, available: 7 },
      nicu: { total: 20, available: 14 },
      ventilator: { total: 20, available: 6 },
      isolation: { total: 15, available: 9 }
    }
  },
  {
    id: "HOSP_011",
    name: "Fortis Escorts Heart Institute New Delhi",
    address: "Okhla Road, Sukhdev Vihar, New Delhi, Delhi 110025",
    lat: 28.5587,
    lng: 77.2783,
    phone: "+91 11 4713 5000",
    email: "contact.escorts@fortishealthcare.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 100, available: 15 },
      icu: { total: 25, available: 3 },
      picu: null,
      nicu: null,
      ventilator: { total: 12, available: 1 },
      isolation: null
    }
  },
  {
    id: "HOSP_012",
    name: "Metro Hospital & Heart Institute Noida",
    address: "X-1, Sector 12, Noida, Uttar Pradesh 201301",
    lat: 28.5912,
    lng: 77.3325,
    phone: "+91 120 422 6666",
    email: "info@metrohospitals.com",
    lastUpdated: new Date().toISOString(),
    beds: {
      general: { total: 110, available: 32 },
      icu: { total: 20, available: 7 },
      picu: { total: 8, available: 4 },
      nicu: { total: 12, available: 8 },
      ventilator: { total: 10, available: 4 },
      isolation: { total: 8, available: 5 }
    }
  }
];

const LOCAL_STORAGE_KEY = "hospital_bed_dashboard_hospitals";

export const getInitialHospitals = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Auto-clear cache if it contains the old SGPGI Lucknow hospital
      if (parsed.length > 0 && (parsed[0].name.includes("SGPGI") || parsed[0].name.includes("Metro General") || Math.abs(parsed[0].lat - 28.5672) > 0.0001 || parsed.length !== 12 || parsed[10]?.beds?.picu !== null)) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load hospitals from localStorage:", error);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_HOSPITALS));
  return DEFAULT_HOSPITALS;
};

export const saveHospitals = (hospitals) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(hospitals));
  } catch (error) {
    console.error("Failed to save hospitals to localStorage:", error);
  }
};

// Simulate random bed fluctuations
export const simulateOccupancyChanges = (hospitals) => {
  let hasChanges = false;
  const updatedHospitals = hospitals.map(hospital => {
    // 30% chance of a change at any hospital on each ticker pulse
    if (Math.random() > 0.3) return hospital;
    
    hasChanges = true;
    const updatedBeds = { ...hospital.beds };
    const bedTypes = Object.keys(updatedBeds).filter(type => updatedBeds[type] !== null);
    if (bedTypes.length === 0) return hospital;
    
    // Choose one bed type at random to modify
    const typeToModify = bedTypes[Math.floor(Math.random() * bedTypes.length)];
    const bedObj = { ...updatedBeds[typeToModify] };
    
    // Random increment or decrement (-1, 0, +1)
    const change = Math.random() > 0.5 ? 1 : -1;
    let newAvailable = bedObj.available + change;
    
    // Keep availability within constraints (0 to total capacity)
    if (newAvailable >= 0 && newAvailable <= bedObj.total) {
      bedObj.available = newAvailable;
    }
    
    updatedBeds[typeToModify] = bedObj;
    
    return {
      ...hospital,
      beds: updatedBeds,
      lastUpdated: new Date().toISOString()
    };
  });
  
  return { updatedHospitals, hasChanges };
};

// Helper to sum all available beds across hospitals
export const getAggregateStats = (hospitals) => {
  const totals = {
    general: { total: 0, available: 0 },
    icu: { total: 0, available: 0 },
    picu: { total: 0, available: 0 },
    nicu: { total: 0, available: 0 },
    ventilator: { total: 0, available: 0 },
    isolation: { total: 0, available: 0 }
  };
  
  hospitals.forEach(hospital => {
    Object.keys(totals).forEach(type => {
      totals[type].total += hospital.beds[type].total;
      totals[type].available += hospital.beds[type].available;
    });
  });
  
  return totals;
};

// Get label name for bed type
export const getBedTypeLabel = (type) => {
  const labels = {
    general: "General Beds",
    icu: "ICU Beds",
    picu: "Pediatric ICU (PICU)",
    nicu: "Neonatal ICU (NICU)",
    ventilator: "Ventilator Beds",
    isolation: "Isolation Beds"
  };
  return labels[type] || type;
};

/**
 * Dynamic geocoding simulator for global coordinates (fully generic street resolver)
 */
export const getDynamicAddress = (lat, lng) => {
  // Generic global geocoder based on coordinates
  const streetNames = ["Hospital Road", "Medical Care Pkwy", "Main Street", "Broadway Avenue", "Care Link Drive", "Parkway Plaza", "Health Boulevard", "Station Road", "Grand Avenue", "Wellness Center Way"];
  const districts = ["Central Valley", "Northside", "West End", "East Gate", "Midtown", "Downtown Heights", "Southside", "Ridge View", "Riverfront", "Metro Plaza"];
  
  // Stable hash from coordinates
  const hash = Math.abs(Math.round(lat * 1234 + lng * 5678));
  const street = streetNames[hash % streetNames.length];
  const district = districts[(hash >> 2) % districts.length];
  const doorNo = 100 + (hash % 850);
  const mockZip = 10000 + (hash % 89999);
  
  const latSign = lat >= 0 ? "N" : "S";
  const lngSign = lng >= 0 ? "E" : "W";
  
  return `${doorNo} ${street}, ${district} (GPS: ${Math.abs(lat).toFixed(4)}°${latSign}, ${Math.abs(lng).toFixed(4)}°${lngSign}, Zip: ${mockZip})`;
};

// Relocate hospitals to surround a new coordinate anywhere on Earth
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
      name: hospital.name,
      address: getDynamicAddress(targetLat, targetLng),
      lat: targetLat,
      lng: targetLng,
      lastUpdated: new Date().toISOString()
    };
  });
};
