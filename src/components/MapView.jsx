import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

export default function MapView({ hospitals, selectedHospital, onSelectHospital, showRouting, userCoords, onMapClick, ambulances, sosActive }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const ambulanceMarkersRef = useRef({});
  const heatCirclesRef = useRef([]);
  const trafficLinesRef = useRef([]);
  const routeLineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Map settings
  const [mapType, setMapType] = useState("osm");
  const [mapSearch, setMapSearch] = useState("");
  const [showTraffic, setShowTraffic] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Keep a fresh reference to map click callback
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([userCoords.lat, userCoords.lng], 13);

    L.control.zoom({ position: "topleft" }).addTo(map);

    // Default tile
    const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    tileLayerRef.current = baseLayer;
    mapRef.current = map;

    // Map Click
    map.on("click", (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update User Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Recreate User Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.remove();
    }

    const markerClass = sosActive ? "custom-div-icon sos-pulse-effect" : "custom-div-icon";
    const userColor = sosActive ? "var(--danger)" : "var(--primary)";
    const userShadow = sosActive ? "0 0 16px var(--danger)" : "0 0 12px var(--primary)";

    const userIcon = L.divIcon({
      className: markerClass,
      html: `
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${userColor};
          border: 3px solid #ffffff;
          box-shadow: ${userShadow};
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: var(--font-sans); font-size: 0.75rem;">
          <strong>Patient Location: ${userCoords.name}</strong><br/>
          GPS Accuracy: ±${userCoords.accuracy || 85}m<br/>
          Speed: ${userCoords.speed || "0.0"} km/h<br/>
          Heading: ${userCoords.heading || "NE"}
        </div>
      `);

    // Draw accuracy circle
    userAccuracyCircleRef.current = L.circle([userCoords.lat, userCoords.lng], {
      radius: userCoords.accuracy || 85,
      color: sosActive ? "var(--danger)" : "var(--primary)",
      fillColor: sosActive ? "var(--danger)" : "var(--primary)",
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: "4, 4"
    }).addTo(map);

    // Automatically pan map to center user location smoothly
    map.panTo([userCoords.lat, userCoords.lng], { animate: true, duration: 0.8 });
  }, [userCoords, sosActive]);

  // Update Map Layer Source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);

    let url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapType === "google-road") {
      url = "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
      attr = "&copy; Google Maps";
    } else if (mapType === "google-sat") {
      url = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
      attr = "&copy; Google Maps Satellite";
    }

    tileLayerRef.current = L.tileLayer(url, { attribution: attr }).addTo(map);
  }, [mapType]);

  // Render Hospital Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    hospitals.forEach(hospital => {
      const matchesSearch = hospital.name.toLowerCase().includes(mapSearch.toLowerCase()) ||
                            hospital.address.toLowerCase().includes(mapSearch.toLowerCase());
      if (mapSearch && !matchesSearch) return;

      let totalAvailable = 0;
      Object.keys(hospital.beds).forEach(k => {
        if (hospital.beds[k] !== null) {
          totalAvailable += hospital.beds[k].available;
        }
      });

      let statusClass = "success";
      if (totalAvailable <= 5) {
        statusClass = "danger sos-pulse-effect"; // Pulsing animation on critical hospitals!
      } else if (totalAvailable <= 20) {
        statusClass = "warning";
      }

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="map-marker-pin ${statusClass}" style="box-shadow: 0 0 10px rgba(0,0,0,0.15)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([hospital.lat, hospital.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: var(--font-sans); width: 220px; padding: 4px;">
            <strong style="color: var(--text-primary); font-size: 0.9rem;">${hospital.name}</strong>
            <p style="color: var(--text-secondary); font-size: 0.7rem; margin: 4px 0 8px 0;">${hospital.address}</p>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; border-top: 1px solid var(--border); padding-top: 6px;">
              <span>Available ICU Beds:</span>
              <span style="font-family: var(--font-mono); color: ${hospital.beds.icu.available <= 1 ? 'var(--danger)' : 'var(--success)'}">${hospital.beds.icu.available}/${hospital.beds.icu.total}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-top: 4px;">
              <span>Ventilators:</span>
              <span style="font-family: var(--font-mono);">${hospital.beds.ventilator.available}/${hospital.beds.ventilator.total}</span>
            </div>
          </div>
        `);

      marker.on("click", () => {
        onSelectHospital(hospital);
      });

      markersRef.current[hospital.id] = marker;
    });
  }, [hospitals, mapSearch, onSelectHospital]);

  // Animate moving ambulances in real-time
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ambulances) return;

    // Check which ambulances were removed
    const activeIds = ambulances.map(a => a.id);
    Object.keys(ambulanceMarkersRef.current).forEach(id => {
      if (!activeIds.includes(id)) {
        ambulanceMarkersRef.current[id].remove();
        delete ambulanceMarkersRef.current[id];
      }
    });

    // Update or add ambulances
    ambulances.forEach(amb => {
      const { id, lat, lng, name, status } = amb;
      
      const ambIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: var(--warning);
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justifyContent: center;
            box-shadow: 0 0 10px var(--warning);
            font-size: 0.8rem;
          ">🚑</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const popupHtml = `
        <div style="font-family: var(--font-sans); font-size: 0.72rem; padding: 2px;">
          <strong style="color: var(--text-primary);">${name}</strong><br/>
          Status: <span style="font-weight: 700; color: ${status === "transit" ? "var(--danger)" : "var(--success)"};">${status}</span><br/>
          Speed: ${status === "transit" ? "48.2" : "0.0"} km/h<br/>
          Heading: North-East (NE)<br/>
          Est. ETA: ${status === "transit" ? "4 mins" : "Standby"}<br/>
          Last Ping: ${new Date().toLocaleTimeString()}
        </div>
      `;

      if (ambulanceMarkersRef.current[id]) {
        ambulanceMarkersRef.current[id].setLatLng([lat, lng]);
        ambulanceMarkersRef.current[id].getPopup().setContent(popupHtml);
      } else {
        ambulanceMarkersRef.current[id] = L.marker([lat, lng], { icon: ambIcon })
          .addTo(map)
          .bindPopup(popupHtml);
      }
    });
  }, [ambulances]);

  // Traffic Bypass Layer rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old lines
    trafficLinesRef.current.forEach(l => l.remove());
    trafficLinesRef.current = [];

    if (showTraffic) {
      // Mock road lines across Hazratganj intersection grids
      const roads = [
        // Ring Road flow (Green - flowing)
        { pts: [[26.830, 80.910], [26.840, 80.930], [26.850, 80.960]], color: "var(--success)" },
        // Bypass Road flow (Yellow - medium traffic)
        { pts: [[26.790, 80.980], [26.820, 81.000], [26.860, 81.010]], color: "var(--warning)" },
        // Main Hazratganj crossing (Red - congested traffic)
        { pts: [[26.843, 80.940], [26.847, 80.948], [26.852, 80.960]], color: "var(--danger)" }
      ];

      roads.forEach(r => {
        const line = L.polyline(r.pts, {
          color: r.color,
          weight: 4,
          opacity: 0.6
        }).addTo(map);
        trafficLinesRef.current.push(line);
      });
    }
  }, [showTraffic]);

  // Emergency Heatmap Layer rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old circles
    heatCirclesRef.current.forEach(c => c.remove());
    heatCirclesRef.current = [];

    if (showHeatmap) {
      const hotspots = [
        { center: [26.846, 80.946], rad: 800, color: "var(--danger)" }, // Hazratganj core SOS alert hotspots
        { center: [26.863, 80.998], rad: 1100, color: "var(--warning)" } // Gomti Nagar
      ];

      hotspots.forEach(hs => {
        const circle = L.circle(hs.center, {
          radius: hs.rad,
          color: hs.color,
          fillColor: hs.color,
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
        heatCirclesRef.current.push(circle);
      });
    }
  }, [showHeatmap]);

  // Fit bounds when selecting hospital
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (selectedHospital && userCoords) {
      const { lat, lng, id } = selectedHospital;
      map.setView([lat, lng], 14, { animate: true });

      const marker = markersRef.current[id];
      if (marker) {
        marker.openPopup();
      }

      if (showRouting) {
        const routePoints = [
          [userCoords.lat, userCoords.lng],
          [userCoords.lat, lng],
          [lat, lng]
        ];

        routeLineRef.current = L.polyline(routePoints, {
          color: "var(--primary)",
          weight: 4,
          opacity: 0.8,
          dashArray: "8, 8",
          lineJoin: "round"
        }).addTo(map);

        const bounds = L.latLngBounds([[userCoords.lat, userCoords.lng], [lat, lng]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (userCoords) {
      const points = [[userCoords.lat, userCoords.lng], ...hospitals.map(h => [h.lat, h.lng])];
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      }
    }
  }, [selectedHospital, showRouting, hospitals, userCoords]);

  return (
    <div className="map-container-wrapper" style={{ position: "relative", height: "100%", width: "100%" }}>
      <div ref={mapContainerRef} style={{ height: "100%", width: "100%", borderRadius: "var(--radius-lg)" }}></div>
      
      {/* Legend & Layers overlay */}
      <div className="glass" style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        zIndex: 1000,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        fontSize: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        maxHeight: "90%",
        overflowY: "auto",
        width: "200px"
      }}>
        <strong style={{ fontSize: "0.8rem", marginBottom: "2px" }}>Beds Available</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--success)" }}></div>
          <span>High (&gt;20 beds)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--warning)" }}></div>
          <span>Medium (5-20 beds)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--danger)", animation: "pulse 1s infinite" }}></div>
          <span style={{ fontWeight: 600, color: "var(--danger)" }}>Critical (&le;5 beds)</span>
        </div>

        {/* Layer Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px" }}>
          <strong style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Toggles</strong>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={showTraffic} onChange={(e) => setShowTraffic(e.target.checked)} />
            <span>Show Live Traffic</span>
          </label>

        </div>

        {/* Search */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px" }}>
          <strong style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Search Map</strong>
          <input 
            type="text" 
            placeholder="Search hospitals..." 
            style={{ 
              fontSize: "0.7rem", 
              padding: "4px 8px", 
              borderRadius: "4px", 
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              outline: "none",
              width: "100%"
            }}
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
          />
        </div>

        {/* Map tiles switcher */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px" }}>
          <strong style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Map Layer Source</strong>
          <select 
            className="select-filter" 
            style={{ fontSize: "0.7rem", padding: "0.2rem 1.5rem 0.2rem 0.4rem", width: "100%" }}
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
          >
            <option value="osm">OpenStreetMap</option>
            <option value="google-road">Google Roadmap</option>
            <option value="google-sat">Google Satellite</option>
          </select>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px", color: "var(--primary)", fontWeight: 700, fontSize: "0.65rem", textAlign: "center" }}>
          📍 Click map to set patient position!
        </div>
      </div>
    </div>
  );
}
