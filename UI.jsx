// Shared UI components
import React from "react";

export const Logo = ({ size = 30 }) => (
  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size, letterSpacing: "-1px", lineHeight: 1 }}>
    <span style={{ color: "var(--text-3)" }}>im</span>
    <span style={{ color: "var(--gold)" }}>PROVED</span>
  </span>
);

export const PrimaryBtn = ({ children, onClick, disabled, full, ariaLabel, style = {}, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    style={{
      background: "var(--gold)",
      border: "none",
      borderRadius: "var(--radius)",
      color: "#0c0c0c",
      fontSize: 14,
      fontWeight: 600,
      padding: "11px 28px",
      width: full ? "100%" : "auto",
      ...style,
    }}
  >
    {children}
  </button>
);

export const GhostBtn = ({ children, onClick, disabled, ariaLabel, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    style={{
      background: "transparent",
      border: "1px solid var(--border-3)",
      borderRadius: "var(--radius)",
      color: "var(--text-3)",
      fontSize: 14,
      fontWeight: 500,
      padding: "10px 24px",
      ...style,
    }}
  >
    {children}
  </button>
);

export const Tag = ({ color, children }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: `${color}14`,
      border: `1px solid ${color}28`,
      borderRadius: 6,
      padding: "4px 12px",
      marginBottom: 20,
    }}
  >
    <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </span>
  </div>
);

export const StepBar = ({ step, color, labels }) => (
  <div style={{ display: "flex", gap: 5, marginBottom: 30 }} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={labels.length}>
    {labels.map((label, i) => (
      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <div
          style={{
            height: 3,
            width: "100%",
            borderRadius: 3,
            background: i <= step ? (i === labels.length - 1 && i === step ? "var(--green)" : color) : "var(--border-2)",
            transition: "background .4s",
          }}
        />
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: i === step ? color : "var(--text-4)",
          }}
        >
          {label}
        </span>
      </div>
    ))}
  </div>
);

export const CharCount = ({ text, min }) => {
  const n = (text || "").trim().length;
  const ok = n >= min;
  return (
    <span style={{ fontSize: 11, color: ok ? "var(--green)" : "var(--text-4)" }}>
      {ok ? "✓ ready" : `${min - n} chars to go`}
    </span>
  );
};

export const SaveStatus = ({ status }) => {
  const map = {
    idle: { color: "var(--text-4)", text: "" },
    saving: { color: "var(--text-3)", text: "Saving..." },
    saved: { color: "var(--green)", text: "✓ Saved" },
    error: { color: "var(--red)", text: "Save failed" },
  };
  const s = map[status] || map.idle;
  if (!s.text) return null;
  return <span style={{ fontSize: 11, color: s.color }}>{s.text}</span>;
};
