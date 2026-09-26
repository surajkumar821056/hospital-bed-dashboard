// Demand Predictor & Emergency Triage AI Module for MedResQ Health
import { getDynamicAddress } from "./mockData";

/**
 * Classifies patient symptoms into Emergency Severity Index (ESI) categories
 * using a token-likelihood matching classifier.
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
  const availableBeds = hospital.beds[bedType]?.available || 5;
  const capacity = hospital.beds[bedType]?.total || 20;
  
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

/**
 * Trains a Simple Linear Regression model on 30 days of mock historical occupancy,
 * then forecasts occupancy rates and spike risks for the next 7 days.
 * @param {Array} hospitals - The list of hospitals
 * @param {string} bedType - Bed filter
 * @returns {Array} 7-day prediction list
 */
export const getOccupancyForecast = (hospitals, bedType = "all") => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDayIndex = new Date().getDay();
  
  // Calculate total capacities across municipal hospitals
  let totalCapacity = 0;
  let totalAvailable = 0;
  
  hospitals.forEach(h => {
    if (bedType === "all") {
      Object.keys(h.beds).forEach(type => {
        totalCapacity += h.beds[type].total;
        totalAvailable += h.beds[type].available;
      });
    } else if (h.beds[bedType]) {
      totalCapacity += h.beds[bedType].total;
      totalAvailable += h.beds[bedType].available;
    }
  });
  
  const currentOccupied = totalCapacity - totalAvailable;
  const baseOccupancyRate = totalCapacity > 0 ? currentOccupied / totalCapacity : 0.7;

  // 1. Generate 30 days of historical training rates incorporating cyclical factors
  const historyDays = 30;
  const historyRates = [];
  for (let i = 0; i < historyDays; i++) {
    const t = i - historyDays;
    const weeklyCycle = 0.06 * Math.sin((t / 7) * Math.PI * 2); // Sine seasonality
    const trend = 0.0015 * t; // Long-term linear trend
    const noise = (Math.random() * 0.04) - 0.02;
    historyRates.push(baseOccupancyRate + weeklyCycle + trend + noise);
  }

  // 2. Train Simple Linear Regression model (fit slope and intercept parameters)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = historyRates.length;
  for (let i = 0; i < n; i++) {
    const x = i - historyDays;
    const y = historyRates[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // 3. Project 7 days forward using the trained model parameters + weekly cycles
  const forecasts = [];
  for (let i = 0; i < 7; i++) {
    const forecastDayIndex = (currentDayIndex + i) % 7;
    const dayName = daysOfWeek[forecastDayIndex];
    
    const xFuture = i;
    const regressionBaseline = slope * xFuture + intercept;

    // Apply weekly cycle factor (peak midweek, dips on weekends)
    let cycleFactor = 1.0;
    if (forecastDayIndex >= 2 && forecastDayIndex <= 4) {
      cycleFactor = 1.06; // Peak midweek
    } else if (forecastDayIndex === 0 || forecastDayIndex === 6) {
      cycleFactor = 0.94; // Weekend dip
    }

    let predictedRate = regressionBaseline * cycleFactor;
    predictedRate = Math.max(0.1, Math.min(0.98, predictedRate));

    const projectedOccupied = Math.round(totalCapacity * predictedRate);
    const projectedAvailable = totalCapacity - projectedOccupied;
    
    // Saturation spike probability equation
    const spikeProb = Math.round(
      Math.min(99, Math.max(1, (predictedRate * 100) - 20 + Math.random() * 10))
    );

    forecasts.push({
      day: dayName,
      occupied: projectedOccupied,
      available: projectedAvailable,
      capacity: totalCapacity,
      occupancyRate: Math.round(predictedRate * 100),
      spikeProbability: spikeProb,
      status: predictedRate > 0.85 ? "Critical" : predictedRate > 0.7 ? "Warning" : "Normal"
    });
  }
  
  return forecasts;
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
