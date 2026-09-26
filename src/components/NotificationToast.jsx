import React from "react";
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function NotificationToast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case "danger":
        return <AlertCircle size={18} className="text-red-500" />;
      case "warning":
        return <AlertTriangle size={18} className="text-amber-500" />;
      case "success":
        return <CheckCircle size={18} className="text-emerald-500" />;
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {getIcon(toast.type)}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
              {toast.type === "danger" ? "Critical Alert" : toast.type === "warning" ? "Capacity Warning" : "System Update"}
            </div>
            <div style={{ opacity: 0.9, fontSize: "0.75rem" }}>{toast.message}</div>
          </div>
          <button onClick={() => onDismiss(toast.id)} className="btn-ghost" style={{ padding: '2px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
