export function PageContainer({ children, maxWidth = 960 }) {
  return (
    <div className="sf-page" style={{ maxWidth, margin: "0 auto", padding: "28px 20px", animation: "fadeIn 0.3s ease" }}>
      {children}
    </div>
  );
}
