import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";
import { Card } from "./Card";

export function StatCard({ label, value, color }) {
  const T = useT();
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: F.display }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </Card>
  );
}
