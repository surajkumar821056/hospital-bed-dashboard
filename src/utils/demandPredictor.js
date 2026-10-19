// Demand Predictor & Emergency Triage AI Module for MedResQ Health


/**
 * Classifies patient symptoms into Emergency Severity Index (ESI) categories
 * using demo keyword rules.
 * @param {string} text - User inputted symptoms description
 * @returns {Object} Classified results containing category, severity indicator, and optimal bed requirements
 */
export const classifyEmergency = (text) => {
  const query = text.toLowerCase();
  
  // Vocabulary weights (classification categories mapping)
  const categories = {
    "ESI-1 (Critical / Cardiac Resuscitation)": {
      keywords: ["chest", "pain", "heart", "cardiac", "stroke", "numb", "unconscious", "collapse", "infarct", "pressure"],
      score: 0.15,
      bed: "icu"
    },
    "ESI-2 (Emergent / Respiratory Distress)": {
      keywords: ["breathe", "breathing", "asthma", "oxygen", "suffocate", "bleed", "blood", "accident", "trauma", "choke", "gasp"],
      score: 0.12,
      bed: "ventilator"
    },
    "ESI-3 (Urgent / Pediatric / High Fever)": {
      keywords: ["fever", "kid", "child", "baby", "pediatric", "fracture", "broken", "vomit", "injury", "burn"],
      score: 0.10,
      bed: "picu"
    },
    "ESI-4 (Less Urgent / Minor Trauma)": {
      keywords: ["headache", "cold", "flu", "cough", "throat", "cut", "scrape", "allergy", "rash", "sprain"],
      score: 0.05,
      bed: "general"
    }
  };

  let bestCategory = "ESI-4 (Less Urgent / Minor Trauma)";
  let maxScore = -Infinity;
  let matchesCount = 0;

  Object.entries(categories).forEach(([cat, data]) => {
    let matches = 0;
    data.keywords.forEach(kw => {
      if (query.includes(kw)) {
        matches++;
      }
    });
    // Multi-criteria scoring metric simulating probability weights
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

/**
 * Predicts wait time using M/M/c queueing theory approximation model.
 * @param {Object} hospital - The hospital object
 * @param {string} bedType - Bed category
 * @returns {number} Projected wait time in minutes
 */
export const predictQueueWaitTime = (hospital, bedType = "general") => {
  const doctors = 6; // Default operational resources
  const availableBeds = hospital.beds[bedType]?.available ?? 0;
  const capacity = hospital.beds[bedType]?.total ?? 0;
  
  // Occupancy factor
  const utilization = capacity > 0 ? (capacity - availableBeds) / capacity : 0.7;
  
  // Base arrival and service rate equations (patients per hour)
  const arrivalRate = 4.5 * (utilization + 0.2); // Lambda
  const serviceRate = 1.2 * doctors; // Mu * c

  // Queue waiting estimation Wq = Lq / Lambda
  let waitTimeHours = 0;
  if (arrivalRate < serviceRate) {
    waitTimeHours = arrivalRate / (serviceRate * (serviceRate - arrivalRate));
  } else {
    // Saturated system penalty
    waitTimeHours = 1.5 + (utilization * 2.0);
  }

  const waitTimeMinutes = Math.round(waitTimeHours * 60);
  return Math.max(5, Math.min(180, waitTimeMinutes));
};

/** Capacity baseline from current persisted inventory; no synthetic history or trained forecast. */
export const getOccupancyForecast = (hospitals, bedType = "all") => {
  let capacity = 0, available = 0;
  for (const h of hospitals) for (const [type, bed] of Object.entries(h.beds)) {
    if (bed && (bedType === "all" || type === bedType)) { capacity += bed.total; available += bed.available; }
  }
  const occupied = capacity - available;
  const occupancyRate = capacity ? Math.round(occupied / capacity * 100) : 0;
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(); day.setDate(day.getDate() + i);
    return { day: day.toLocaleDateString('en', { weekday: 'short' }), capacity, occupied, available, occupancyRate,
      spikeProbability: occupancyRate, status: occupancyRate > 85 ? "Critical" : occupancyRate > 70 ? "Warning" : "Normal" };
  });
};

/**
 * Evaluates the risk status of each hospital based on current ICU/Ventilator availability.
 */
export const checkCapacityAlerts = (hospitals) => {
  const alerts = [];
  
  hospitals.forEach(h => {
    const icu = h.beds.icu;
    if (icu.available <= 1) {
      alerts.push({
        id: `${h.id}_icu_crit`,
        hospitalName: h.name,
        type: "danger",
        message: `${h.name} has only ${icu.available} ICU bed(s) remaining!`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else if (icu.available / icu.total <= 0.15) {
      alerts.push({
        id: `${h.id}_icu_warn`,
        hospitalName: h.name,
        type: "warning",
        message: `${h.name} is running low on ICU beds (${icu.available} left).`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    const vent = h.beds.ventilator;
    if (vent.available === 0) {
      alerts.push({
        id: `${h.id}_vent_crit`,
        hospitalName: h.name,
        type: "danger",
        message: `${h.name} has 0 Ventilators available!`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });
  
  return alerts;
};

/**
 * Computes a multi-attribute suitability match score between a patient and all hospitals.
 * Takes into account GPS distance, bed capacity ratio, specialist alignment, and ER congestion.
 */
export const evaluateHospitalMatching = (userLat, userLng, ESIResult, hospitals) => {
  const targetBedType = ESIResult.recommendedBed || "general";
  const category = ESIResult.category;

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Specialties checklist mapping
  const specialtiesMap = {
    "HOSP_001": ["Cardiologist", "Neurologist", "ICU Specialist"],
    "HOSP_002": ["Trauma surgeon", "ICU Specialist", "Pediatrician"],
    "HOSP_003": ["Cardiologist", "Pulmonary specialist", "ICU Specialist"],
    "HOSP_004": ["General physician", "ICU Specialist"],
    "HOSP_005": ["Pediatrician", "General surgeon"]
  };

  return hospitals.map(h => {
    const distance = calculateDistanceKm(userLat, userLng, h.lat, h.lng);
    const waitTime = predictQueueWaitTime(h, targetBedType);
    const available = h.beds[targetBedType]?.available || 0;
    const total = h.beds[targetBedType]?.total || 1;
    const occupancyRatio = available / total;

    let score = 0;
    const breakdown = [];

    // 1. Bed Availability Weight (Max 40 points)
    if (available > 0) {
      score += 25;
      breakdown.push("Beds Available (+25)");
      
      if (occupancyRatio > 0.25) {
        score += 15;
        breakdown.push("Healthy Margin (+15)");
      } else {
        score += 5;
        breakdown.push("Saturated Capacity (+5)");
      }
    } else {
      breakdown.push("CRITICAL: No Beds Available (+0)");
    }

    // 2. Geolocation Proximity Weight (Max 25 points)
    if (distance <= 3) {
      score += 25;
      breakdown.push("Immediate Proximity <3km (+25)");
    } else if (distance <= 7) {
      score += 15;
      breakdown.push("Short Range 3-7km (+15)");
    } else if (distance <= 12) {
      score += 8;
      breakdown.push("Mid Range 7-12km (+8)");
    } else {
      score += 2;
      breakdown.push("Long Range >12km (+2)");
    }

    // 3. Queue Congestion Weight (Max 20 points)
    if (waitTime <= 15) {
      score += 20;
      breakdown.push("Fast ER Queue <15m (+20)");
    } else if (waitTime <= 45) {
      score += 12;
      breakdown.push("Moderate ER Queue 15-45m (+12)");
    } else {
      score += 4;
      breakdown.push("Saturated ER Queue >45m (+4)");
    }

    // 4. Specialty Alignment Weight (Max 15 points)
    const hospitalSpecialties = specialtiesMap[h.id] || [];
    let specialtyAligned = false;

    if (category.includes("Critical / Cardiac") && hospitalSpecialties.includes("Cardiologist")) {
      specialtyAligned = true;
    } else if (category.includes("Emergent / Respiratory") && hospitalSpecialties.includes("Pulmonary specialist")) {
      specialtyAligned = true;
    } else if (category.includes("Urgent / Pediatric") && hospitalSpecialties.includes("Pediatrician")) {
      specialtyAligned = true;
    }

    if (specialtyAligned) {
      score += 15;
      breakdown.push("Clinical Specialty Aligned (+15)");
    } else if (hospitalSpecialties.includes("ICU Specialist") && (targetBedType === "icu" || targetBedType === "ventilator")) {
      score += 10;
      breakdown.push("ICU Specialist Available (+10)");
    } else {
      score += 3;
      breakdown.push("General Support (+3)");
    }

    // Hard constraint: If no beds are available, cap max suitability score to 20%
    let finalPercentage = score;
    if (available === 0) {
      finalPercentage = Math.min(20, score);
    }

    return {
      hospital: h,
      distance,
      waitTime,
      score: finalPercentage,
      breakdown
    };
  }).sort((a, b) => b.score - a.score);
};
