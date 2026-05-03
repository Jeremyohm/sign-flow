import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function PageHeader({ title, subtitle, children }) {
  const T = useT();
  return (
    <div className="sf-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 600, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: T.textSec, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
