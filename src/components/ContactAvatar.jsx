const AVATAR_COLORS = [
  "#1E5128", "#7B2D26", "#5C4033", "#37474F",
  "#3E5641", "#2E5266", "#6A4F3A", "#4B3F72",
];

export function avatarColorForEmail(email) {
  const src = (email || "").toLowerCase();
  let h = 0;
  for (let i = 0; i < src.length; i++) h = ((h * 31) + src.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initialsFor(name, email) {
  const n = (name || "").trim();
  if (n) return n.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const e = (email || "").trim();
  if (e) return (e[0] || "?").toUpperCase();
  return "?";
}

export function ContactAvatar({ name, email, size = 36 }) {
  const bg = avatarColorForEmail(email);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: Math.round(size * 0.4), fontWeight: 600, letterSpacing: 0.5,
      flexShrink: 0,
    }}>{initialsFor(name, email)}</div>
  );
}
