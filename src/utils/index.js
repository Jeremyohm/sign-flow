export { usePersistedState } from "./usePersistedState";
export { useDocTitle } from "./useDocTitle";
export { useT } from "./useThemeColors";

let _id = 100;
export const uid = () => `id_${++_id}`;
export const signingUrl = (idOrToken) => `${window.location.origin}/sign/${idOrToken}`;
export const fd = d => {
  if (!d) return "—";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "—";
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
export const ft = d => {
  if (!d) return "—";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "—";
  return t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export function mkPage(n, tot, name) {
  const c = document.createElement("canvas"); c.width = 612; c.height = 792;
  const x = c.getContext("2d");
  x.fillStyle = "#FDFCFA"; x.fillRect(0, 0, 612, 792);
  x.fillStyle = "#6B7F3A"; x.fillRect(24, 24, 564, 2);
  x.fillStyle = "#2C2A25"; x.font = "bold 11px Helvetica"; x.fillText("E-SIGNATURE DOCUMENT", 24, 52);
  x.fillStyle = "#9C958B"; x.font = "10px Helvetica"; x.fillText(`Page ${n} of ${tot}`, 520, 52);
  x.fillStyle = "#E8E3DA";
  for (let i = 0; i < 28; i++) {
    const y2 = 80 + i * 22;
    const w2 = i === 0 ? 260 : i % 7 === 0 ? 200 : 400 + Math.random() * 140;
    x.fillRect(24, y2, Math.min(w2, 564), i === 0 ? 3 : 1.5);
  }
  if (n === tot) {
    x.fillStyle = "#2C2A25"; x.font = "bold 12px Helvetica"; x.fillText("SIGNATURES", 24, 570);
    x.fillStyle = "#DDD6CA";
    x.fillRect(24, 590, 220, 0.8); x.fillRect(24, 650, 220, 0.8);
    x.fillRect(320, 590, 220, 0.8); x.fillRect(320, 650, 220, 0.8);
    x.fillStyle = "#9C958B"; x.font = "9px Helvetica";
    x.fillText("Signer 1", 24, 608); x.fillText("Date", 24, 668);
    x.fillText("Signer 2", 320, 608); x.fillText("Date", 320, 668);
  }
  x.fillStyle = "#E8E3DA"; x.fillRect(24, 756, 564, 0.5);
  x.fillStyle = "#9C958B"; x.font = "8px Helvetica"; x.fillText(name || "Untitled", 24, 774);
  return c.toDataURL("image/png");
}
