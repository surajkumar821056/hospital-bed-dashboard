import React, { useEffect, useRef } from "react";
import { X, Check } from "lucide-react";

export default function QRCodeModal({ hospital, onClose, lang }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !hospital) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, 200, 200);

    // Draw QR code background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 200, 200);

    // Seeded random function based on hospital ID to make the QR code deterministic
    let seed = hospital.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Draw QR Code Position Indicators (Three large squares in corners)
    const drawFinderPattern = (x, y) => {
      ctx.fillStyle = "#09090b"; // Zinc 950 / Black
      ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 5, y + 5, 30, 30);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(x + 10, y + 10, 20, 20);
    };

    drawFinderPattern(10, 10);   // Top Left
    drawFinderPattern(150, 10);  // Top Right
    drawFinderPattern(10, 150);  // Bottom Left

    // Draw random data blocks
    ctx.fillStyle = "#09090b";
    const blockSize = 5;
    
    for (let r = 0; r < 200; r += blockSize) {
      for (let c = 0; c < 200; c += blockSize) {
        // Skip finder pattern zones
        const isTopLeft = r < 55 && c < 55;
        const isTopRight = r < 55 && c > 145;
        const isBottomLeft = r > 145 && c < 55;
        const isCenter = r > 85 && r < 115 && c > 85 && c < 115; // Save space for center design
        
        if (isTopLeft || isTopRight || isBottomLeft || isCenter) continue;

        if (pseudoRandom() > 0.5) {
          ctx.fillRect(c, r, blockSize, blockSize);
        }
      }
    }

    // Draw a small colored medical cross in the center to make it look premium
    ctx.fillStyle = "#ef4444"; // Red Cross
    ctx.fillRect(94, 88, 12, 24);
    ctx.fillRect(88, 94, 24, 12);

    // Draw border
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 200, 200);

  }, [hospital]);

  const trans = {
    en: {
      title: "Express Admission QR Code",
      subtitle: "Scan at emergency kiosk to automatically check-in.",
      hospital: "Hospital",
      admit: "Ready for Check-In",
      close: "Close"
    },
    hi: {
      title: "त्वरित प्रवेश क्यूआर कोड",
      subtitle: "स्वचालित रूप से चेक-इन करने के लिए आपातकालीन कियोस्क पर स्कैन करें।",
      hospital: "अस्पताल",
      admit: "चेक-इन के लिए तैयार",
      close: "बंद करें"
    }
  };

  const t = trans[lang] || trans.en;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="modal-close">
          <X size={20} />
        </button>

        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.title}</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "280px" }}>{t.subtitle}</p>

        <div className="qr-canvas-wrapper">
          <canvas ref={canvasRef} width="200" height="200"></canvas>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t.hospital}</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{hospital.name}</div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          fontWeight: 600,
          width: '100%',
          justifyContent: 'center'
        }}>
          <Check size={16} />
          <span>{t.admit}</span>
        </div>
      </div>
    </div>
  );
}
