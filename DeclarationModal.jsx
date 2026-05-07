// DeclarationModal — explicit confirmation before starting the app
// and before each phase submission. Not a checkbox. A deliberate moment.
// Each statement requires an individual tap before the button unlocks.

import React, { useState } from "react";
import { PrimaryBtn } from "./UI";

const APP_START_STATEMENTS = [
  "This is my work. I will write in my own words from my own real experiences.",
  "I understand that every submission is reviewed personally by a veteran educator — not just an algorithm.",
  "I know that if anything I write raises a safety concern, both I and my parent will be notified and my access will be paused until my parent confirms they reviewed it.",
  "I understand this program is hard by design. That's the point.",
];

const PHASE_SUBMIT_STATEMENTS = [
  "Everything I submitted in this phase is my own work, written in my own words.",
  "The real-world challenge I documented actually happened. I did not fabricate it.",
  "I did not use AI to write any part of my responses.",
];

export function DeclarationModal({ type = "app_start", onConfirm, skillName }) {
  const statements = type === "app_start" ? APP_START_STATEMENTS : PHASE_SUBMIT_STATEMENTS;
  const [confirmed, setConfirmed] = useState(new Set());

  const allConfirmed = confirmed.size === statements.length;

  function toggle(i) {
    setConfirmed(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="declaration-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 9998,
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
          id="declaration-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: type === "app_start" ? 22 : 20,
            fontWeight: 800,
            color: "var(--text-1)",
            marginBottom: 10,
          }}
        >
          {type === "app_start"
            ? "Before you begin"
            : `Before you submit ${skillName ? `— ${skillName}` : ""}`}
        </h2>

        <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7, marginBottom: 24 }}>
          {type === "app_start"
            ? "Tap each statement to confirm you understand it. All four are required to continue."
            : "Confirm each statement. This is your word, attached to your name."}
        </p>

        <div style={{ marginBottom: 28 }}>
          {statements.map((statement, i) => {
            const isChecked = confirmed.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  width: "100%",
                  background: isChecked ? "rgba(74,171,106,0.1)" : "var(--bg-3)",
                  border: `1px solid ${isChecked ? "rgba(74,171,106,0.4)" : "var(--border-2)"}`,
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                  marginBottom: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .2s",
                }}
                aria-pressed={isChecked}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${isChecked ? "var(--green)" : "var(--border-3)"}`,
                    background: isChecked ? "var(--green)" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                    transition: "all .2s",
                  }}
                >
                  {isChecked && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 14, lineHeight: 1.7, color: isChecked ? "var(--text-1)" : "var(--text-2)" }}>
                  {statement}
                </span>
              </button>
            );
          })}
        </div>

        <PrimaryBtn
          onClick={onConfirm}
          disabled={!allConfirmed}
          full
          style={{ padding: "13px", fontSize: 15 }}
        >
          {allConfirmed
            ? type === "app_start" ? "I confirm — let's begin →" : "I confirm — submit for review →"
            : `Confirm all ${statements.length - confirmed.size} remaining statement${statements.length - confirmed.size !== 1 ? "s" : ""} above`}
        </PrimaryBtn>

        {type === "app_start" && (
          <p style={{ marginTop: 16, fontSize: 11, color: "var(--text-4)", textAlign: "center", lineHeight: 1.7 }}>
            These confirmations are logged with a timestamp. They are part of your record.
          </p>
        )}
      </div>
    </div>
  );
}
