export default function App() {
  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#3b82f6" />
            <path
              d="M24 10L38 20V38H30V28H18V38H10V20L24 10Z"
              fill="white"
            />
          </svg>
        </div>
        <h1 style={styles.title}>EstateFlow</h1>
        <p style={styles.subtitle}>
          Real estate management platform for agents, clients, and brokerages.
        </p>
        <p style={styles.mobileNote}>
          Available on iOS and Android — download the app to get started.
        </p>
        <div style={styles.badge}>
          <span style={styles.dot} />
          API is live
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "1.5rem",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "1.5rem",
    padding: "3rem 2.5rem",
    maxWidth: "420px",
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  logo: {
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  mobileNote: {
    fontSize: "0.875rem",
    color: "#64748b",
    lineHeight: 1.5,
  },
  badge: {
    marginTop: "0.5rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#0f2d1a",
    border: "1px solid #166534",
    color: "#4ade80",
    fontSize: "0.8rem",
    fontWeight: 500,
    padding: "0.375rem 0.875rem",
    borderRadius: "999px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
  },
};
