import React from "react";
import { CRISIS_RESOURCES } from "../lib/crisis";
import { GhostBtn } from "./UI";

export function CrisisOverlay({ onDismiss }) {
  return (
    <div
      role="dialog"
      aria-labelledby="crisis-title"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "var(--bg-2)",
          border: "1px solid var(--border-3)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
        }}
      >
        <h2
          id="crisis-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-1)",
            marginBottom: 14,
          }}
        >
          Before you go further
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text-2)", marginBottom: 20 }}>
          Some of what you wrote signals that you might be going through something serious right
          now. This platform is built to push you, but not when something else needs to come first.
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text-2)", marginBottom: 28 }}>
          If any part of you is in crisis — even a small part — please reach out to a real person
          who can actually help. The resources below are free, confidential, and available right
          now. You don't have to be in immediate danger to use them.
        </p>

        <div
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--radius)",
            padding: "20px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: 8,
            }}
          >
            Start here
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: 6,
            }}
          >
            {CRISIS_RESOURCES.primary.name}
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 10, lineHeight: 1.7 }}>
            {CRISIS_RESOURCES.primary.description}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href={`tel:${CRISIS_RESOURCES.primary.phone}`}
              style={{
                color: "var(--gold)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              📞 Call {CRISIS_RESOURCES.primary.phone}
            </a>
            <a
              href={CRISIS_RESOURCES.primary.web}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--gold)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              💬 {CRISIS_RESOURCES.primary.text}
            </a>
          </div>
        </div>

        <details style={{ marginBottom: 24 }}>
          <summary
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            More resources
          </summary>
          <div style={{ marginTop: 12 }}>
            {CRISIS_RESOURCES.secondary.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 0",
                  borderTop: i > 0 ? "1px solid var(--border-1)" : "none",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 6, lineHeight: 1.6 }}>
                  {r.description}
                </div>
                <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 500 }}>{r.action}</div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <GhostBtn onClick={onDismiss}>I want to keep going</GhostBtn>
          <a
            href={CRISIS_RESOURCES.primary.web}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "var(--gold)",
              color: "#0c0c0c",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: "var(--radius)",
              textDecoration: "none",
            }}
          >
            Get help now →
          </a>
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: "var(--text-4)", lineHeight: 1.7 }}>
          What you wrote is private. We have not contacted anyone. You're in control of what
          happens next.
        </p>
      </div>
    </div>
  );
}
