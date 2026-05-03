import { useEffect } from "react";
import { useT } from "../../utils/useThemeColors";

export function Modal({ children, onClose }) {
  const T = useT();
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(44,42,37,0.4)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, width: "100%", maxWidth: 580,
        boxShadow: T.shadowLg, overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}
