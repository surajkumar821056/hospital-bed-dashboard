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

// GPS coordinates are displayed directly; no geocoding provider is configured.
export const getDynamicAddress = (lat, lng) => `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
