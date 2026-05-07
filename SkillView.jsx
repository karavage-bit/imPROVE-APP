// SkillView — main component for completing a skill (Defense Submission model)
// Step 0: Hook · Step 1: Science · Step 2: Challenge · Step 3: Defense · Step 4: Verified

import React, { useReducer, useEffect, useState, useRef, useCallback } from "react";
import { Logo, PrimaryBtn, GhostBtn, Tag, StepBar, CharCount, SaveStatus } from "./UI";
import { CrisisOverlay } from "./CrisisOverlay";
import { DeclarationModal } from "./DeclarationModal";
import { useAutoSave } from "../hooks/useAutoSave";
import { useDefenseEval } from "../hooks/useDefenseEval";
import { detectCrisisContent } from "../lib/crisis";
import { supabase, loadProgress } from "../lib/supabase";
import { SKILL_VERSIONS } from "../data/versions";

// Behavioral detection — tracks paste events and timing per field
function useBehavioralDetection() {
  const flags = useRef([]);
  const fieldStartTimes = useRef({});

  const recordFieldStart = useCallback((fieldName) => {
    fieldStartTimes.current[fieldName] = Date.now();
  }, []);

  const recordPaste = useCallback((fieldName, pastedLength) => {
    flags.current.push(`Paste detected in ${fieldName}: ${pastedLength} characters pasted at once`);
  }, []);

  const recordFieldComplete = useCallback((fieldName, finalLength) => {
    const start = fieldStartTimes.current[fieldName];
    if (!start) return;
    const elapsed = (Date.now() - start) / 1000;
    const charsPerSecond = finalLength / elapsed;
    if (charsPerSecond > 20 && finalLength > 200) {
      flags.current.push(`${fieldName}: ${finalLength} chars in ${elapsed.toFixed(0)}s (${charsPerSecond.toFixed(1)} chars/sec — unusually fast)`);
    }
  }, []);

  const getFlags = useCallback(() => [...flags.current], []);
  const clearFlags = useCallback(() => { flags.current = []; }, []);

  return { recordFieldStart, recordPaste, recordFieldComplete, getFlags, clearFlags };
}

const STEP_LABELS = ["Hook", "Science", "Challenge", "Defense", "Verified"];

const DEFENSE_MIN_INITIAL = 400;
const DEFENSE_MIN_FOLLOWUP = 200;

const initialState = {
  step: 0,
  hookResponse: "",
  scienceResponse: "",
  challengeResponse: "",
  hookRead: false,
  scienceRead: false,
  // Defense responses
  defenseInitial: "",
  defenseQ1: "",
  defenseQ2: "",
  defenseQ3: "",
  defenseSubStep: 0, // 0=initial, 1=q1, 2=q2, 3=q3, 4=evaluating, 5=result
  crisisShown: false,
  showPhaseDeclaration: false,
  reviewSubmitted: false,
  loading: true,
  verificationSlug: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, loading: false };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_HOOK":
      return { ...state, hookResponse: action.value };
    case "SET_SCIENCE":
      return { ...state, scienceResponse: action.value };
    case "SET_CHALLENGE":
      return { ...state, challengeResponse: action.value };
    case "MARK_HOOK_READ":
      return { ...state, hookRead: true };
    case "MARK_SCIENCE_READ":
      return { ...state, scienceRead: true };
    case "SET_DEFENSE_INITIAL":
      return { ...state, defenseInitial: action.value };
    case "SET_DEFENSE_Q1":
      return { ...state, defenseQ1: action.value };
    case "SET_DEFENSE_Q2":
      return { ...state, defenseQ2: action.value };
    case "SET_DEFENSE_Q3":
      return { ...state, defenseQ3: action.value };
    case "SET_DEFENSE_SUBSTEP":
      return { ...state, defenseSubStep: action.value };
    case "RESET_DEFENSE":
      return {
        ...state,
        defenseInitial: "",
        defenseQ1: "",
        defenseQ2: "",
        defenseQ3: "",
        defenseSubStep: 0,
      };
    case "SHOW_CRISIS":
      return { ...state, crisisShown: true };
    case "DISMISS_CRISIS":
      return { ...state, crisisShown: false };
    case "SHOW_PHASE_DECLARATION":
      return { ...state, showPhaseDeclaration: true };
    case "HIDE_PHASE_DECLARATION":
      return { ...state, showPhaseDeclaration: false };
    case "SET_REVIEW_SUBMITTED":
      return { ...state, reviewSubmitted: true, step: 4 };
    case "SET_VERIFICATION":
      return { ...state, verificationSlug: action.slug };
    default:
      return state;
  }
}

export function SkillView({ skill, userId, displayName, onComplete, onBack }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const skillVersion = SKILL_VERSIONS[skill.id];
  const behavioral = useBehavioralDetection();

  // Hydrate from Supabase on mount
  useEffect(() => {
    if (!userId) {
      dispatch({ type: "HYDRATE", payload: {} });
      return;
    }
    loadProgress(userId, skill.id, skillVersion).then((rows) => {
      const payload = {};
      rows.forEach((r) => {
        if (r.step === 0) payload.hookResponse = r.response_text || "";
        if (r.step === 1) payload.scienceResponse = r.response_text || "";
        if (r.step === 2) payload.challengeResponse = r.response_text || "";
        if (r.step === 3) {
          // Defense step stores all 4 responses as JSON
          try {
            const parsed = JSON.parse(r.response_text || "{}");
            payload.defenseInitial = parsed.initial || "";
            payload.defenseQ1 = parsed.q1 || "";
            payload.defenseQ2 = parsed.q2 || "";
            payload.defenseQ3 = parsed.q3 || "";
          } catch (e) {
            // Old format or invalid; start fresh
          }
        }
      });
      const completedSteps = rows.filter((r) => r.step_status === "completed").length;
      payload.step = Math.min(completedSteps, 4);
      dispatch({ type: "HYDRATE", payload });
    });
  }, [userId, skill.id, skillVersion]);

  // Auto-save for each text field
  const hookSave = useAutoSave({ userId, skillId: skill.id, skillVersion, step: 0, value: state.hookResponse });
  const sciSave = useAutoSave({ userId, skillId: skill.id, skillVersion, step: 1, value: state.scienceResponse });
  const chalSave = useAutoSave({ userId, skillId: skill.id, skillVersion, step: 2, value: state.challengeResponse });
  // Defense step auto-saves the JSON of all 4 responses
  const defenseSave = useAutoSave({
    userId,
    skillId: skill.id,
    skillVersion,
    step: 3,
    value: JSON.stringify({
      initial: state.defenseInitial,
      q1: state.defenseQ1,
      q2: state.defenseQ2,
      q3: state.defenseQ3,
    }),
  });

  function checkCrisisAndAdvance(text, nextStep) {
    const crisis = detectCrisisContent(text);
    if (crisis.detected) {
      dispatch({ type: "SHOW_CRISIS" });
      return;
    }
    dispatch({ type: "SET_STEP", step: nextStep });
  }

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>Loading your progress...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", maxWidth: 680, margin: "0 auto", padding: "24px 20px 60px" }}>
      {state.crisisShown && <CrisisOverlay onDismiss={() => dispatch({ type: "DISMISS_CRISIS" })} />}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--text-4)", fontSize: 13, cursor: "pointer" }}
          aria-label="Back to dashboard"
        >
          ← back
        </button>
        <Logo size={20} />
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 4, height: 44, background: skill.color, borderRadius: 2 }} />
        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-4)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Skill {String(skill.id + 1).padStart(2, "0")} of 10
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>
            {skill.name}
          </h1>
        </div>
      </div>

      <StepBar step={state.step} color={skill.color} labels={STEP_LABELS} />

      {state.step === 0 && (
        <HookStep
          skill={skill}
          value={state.hookResponse}
          setValue={(v) => dispatch({ type: "SET_HOOK", value: v })}
          read={state.hookRead}
          markRead={() => dispatch({ type: "MARK_HOOK_READ" })}
          onNext={() => checkCrisisAndAdvance(state.hookResponse, 1)}
          saveStatus={hookSave.status}
        />
      )}
      {state.step === 1 && (
        <ScienceStep
          skill={skill}
          value={state.scienceResponse}
          setValue={(v) => dispatch({ type: "SET_SCIENCE", value: v })}
          read={state.scienceRead}
          markRead={() => dispatch({ type: "MARK_SCIENCE_READ" })}
          onNext={() => dispatch({ type: "SET_STEP", step: 2 })}
          saveStatus={sciSave.status}
        />
      )}
      {state.step === 2 && (
        <ChallengeStep
          skill={skill}
          value={state.challengeResponse}
          setValue={(v) => dispatch({ type: "SET_CHALLENGE", value: v })}
          onNext={() => checkCrisisAndAdvance(state.challengeResponse, 3)}
          saveStatus={chalSave.status}
        />
      )}
      {state.step === 3 && (
        <>
          {state.showPhaseDeclaration && (
            <DeclarationModal
              type="phase_submit"
              skillName={skill.name}
              onConfirm={async () => {
                dispatch({ type: "HIDE_PHASE_DECLARATION" });
                const flags = behavioral.getFlags();
                behavioral.clearFlags();
                const session = (await supabase.auth.getSession()).data.session;
                const res = await fetch("/api/submit-for-review", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    skillId: skill.id,
                    hookResponse: state.hookResponse,
                    scienceResponse: state.scienceResponse,
                    challengeResponse: state.challengeResponse,
                    defenseInitial: state.defenseInitial,
                    defenseQ1: state.defenseQ1,
                    defenseQ2: state.defenseQ2,
                    defenseQ3: state.defenseQ3,
                    defenseJudgment: state._pendingJudgment?.judgment || "engaged",
                    defenseObservation: state._pendingJudgment?.observation || null,
                    behavioralFlags: flags,
                  }),
                });
                const data = await res.json();
                if (data.success) dispatch({ type: "SET_REVIEW_SUBMITTED" });
              }}
            />
          )}
          <DefenseStep
            skill={skill}
            state={state}
            dispatch={dispatch}
            saveStatus={defenseSave.status}
            behavioral={behavioral}
            onComplete={(judgment) => {
              // Store judgment, show declaration before submitting
              dispatch({ type: "HYDRATE", payload: { _pendingJudgment: judgment } });
              dispatch({ type: "SHOW_PHASE_DECLARATION" });
            }}
          />
        </>
      )}
      {state.step === 4 && (
        state.verificationSlug
          ? <VerifiedStep skill={skill} slug={state.verificationSlug} displayName={displayName} onDone={onComplete} />
          : <PendingReviewStep skill={skill} onDone={onComplete} />
      )}
    </div>
  );
}

// ----- Step components -----

function HookStep({ skill, value, setValue, read, markRead, onNext, saveStatus }) {
  return (
    <div className="au">
      <Tag color="var(--gold)">The Hook</Tag>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 22, lineHeight: 1.45 }}>
        {skill.hook.title}
      </h2>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderLeft: `3px solid ${skill.color}`,
          borderRadius: "0 12px 12px 0",
          padding: "22px 22px 22px 20px",
          marginBottom: 24,
          fontSize: 15,
          lineHeight: 1.95,
          color: "var(--text-2)",
          whiteSpace: "pre-wrap",
        }}
      >
        {skill.hook.story}
      </div>
      {!read ? (
        <GhostBtn onClick={markRead}>I read this →</GhostBtn>
      ) : (
        <div className="au">
          <div style={{ borderLeft: `3px solid ${skill.color}`, paddingLeft: 18, marginBottom: 16 }}>
            <p style={{ fontSize: 15, color: "var(--text-1)", lineHeight: 1.8, fontStyle: "italic" }}>
              {skill.hook.question}
            </p>
          </div>
          <textarea
            rows={6}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write your honest answer here — this is just for you..."
            aria-label="Hook reflection"
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <CharCount text={value} min={skill.hook.min} />
              <SaveStatus status={saveStatus} />
            </div>
            <PrimaryBtn onClick={onNext} disabled={value.trim().length < skill.hook.min}>
              Continue →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function ScienceStep({ skill, value, setValue, read, markRead, onNext, saveStatus }) {
  return (
    <div className="au">
      <Tag color="var(--blue)">The Science</Tag>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 22, lineHeight: 1.45 }}>
        {skill.science.title}
      </h2>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-lg)",
          padding: "22px",
          marginBottom: 14,
          fontSize: 14,
          lineHeight: 1.95,
          color: "var(--text-2)",
          whiteSpace: "pre-wrap",
        }}
      >
        {skill.science.body}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          background: "#090909",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-4)" }}>📚</span>
        <span style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7 }}>{skill.science.citation}</span>
      </div>
      {!read ? (
        <GhostBtn onClick={markRead}>I've read this →</GhostBtn>
      ) : (
        <div className="au">
          <div style={{ borderLeft: "3px solid var(--blue)", paddingLeft: 18, marginBottom: 16 }}>
            <p style={{ fontSize: 15, color: "var(--text-1)", lineHeight: 1.8, fontStyle: "italic" }}>
              {skill.science.question}
            </p>
          </div>
          <textarea
            rows={5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Connect this to your own life..."
            aria-label="Science reflection"
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <CharCount text={value} min={skill.science.min} />
              <SaveStatus status={saveStatus} />
            </div>
            <PrimaryBtn onClick={onNext} disabled={value.trim().length < skill.science.min}>
              Continue →
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeStep({ skill, value, setValue, onNext, saveStatus }) {
  return (
    <div className="au">
      <Tag color="var(--green)">Real-World Challenge</Tag>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 20, lineHeight: 1.45 }}>
        {skill.challenge.title}
      </h2>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid rgba(74,171,106,0.2)",
          borderLeft: "3px solid var(--green)",
          borderRadius: "0 12px 12px 0",
          padding: "22px 22px 22px 20px",
          marginBottom: 22,
          fontSize: 14,
          lineHeight: 1.95,
          color: "var(--text-2)",
          whiteSpace: "pre-wrap",
        }}
      >
        {skill.challenge.mission}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>{skill.challenge.prompt}</p>
      <textarea
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Document what you did and what happened..."
        aria-label="Challenge documentation"
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <CharCount text={value} min={skill.challenge.min} />
          <SaveStatus status={saveStatus} />
        </div>
        <PrimaryBtn onClick={onNext} disabled={value.trim().length < skill.challenge.min}>
          Enter the Defense →
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ============================================================================
// DEFENSE STEP — replaces the previous live Socratic chat.
// Sub-steps: 0=initial defense, 1=q1, 2=q2, 3=q3, 4=submit/evaluate, 5=result
// ============================================================================
function DefenseStep({ skill, state, dispatch, saveStatus, behavioral, onComplete }) {
  const evaluator = useDefenseEval({ skillId: skill.id });
  const sub = state.defenseSubStep;
  const followUps = skill.defense.followUps;

  function advanceTo(next) {
    dispatch({ type: "SET_DEFENSE_SUBSTEP", value: next });
  }

  async function handleSubmit() {
    advanceTo(4);
    const data = await evaluator.submit({
      initial: state.defenseInitial,
      q1: state.defenseQ1,
      q2: state.defenseQ2,
      q3: state.defenseQ3,
    });
    if (data) advanceTo(5);
    else advanceTo(3); // back to last response on error
  }

  function handleAcceptResult() {
    onComplete({
      judgment: evaluator.result.judgment,
      observation: evaluator.result.observation,
    });
  }

  function handleRevise() {
    evaluator.reviseAndResubmit();
    advanceTo(0);
  }

  return (
    <div className="au">
      {evaluator.result?.judgment === "crisis_flag" && (
        <CrisisOverlay onDismiss={handleRevise} />
      )}

      <Tag color="var(--pink)">The Defense</Tag>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 14, lineHeight: 1.45 }}>
        Defend your thinking
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.85, marginBottom: 24 }}>
        You'll respond to one scenario, then three follow-up questions designed to push past the
        easy answer. After all four, an evaluator reviews your responses and judges whether you
        engaged the prompts substantively. No live chat. No real-time pushback. Just your defense,
        on the page.
      </p>

      {/* Scenario card - always visible */}
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderLeft: "3px solid var(--pink)",
          borderRadius: "0 12px 12px 0",
          padding: "18px 20px",
          marginBottom: 24,
          fontSize: 14,
          lineHeight: 1.85,
          color: "var(--text-2)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-4)",
            marginBottom: 8,
          }}
        >
          Scenario
        </div>
        {skill.defense.scenario}
      </div>

      {sub === 0 && (
        <DefenseField
          questionLabel="Initial Defense"
          questionText="What's your move? Don't reach for the polished answer. Reach for the honest one."
          value={state.defenseInitial}
          setValue={(v) => dispatch({ type: "SET_DEFENSE_INITIAL", value: v })}
          minChars={DEFENSE_MIN_INITIAL}
          saveStatus={saveStatus}
          onNext={() => advanceTo(1)}
          stepIndicator="1 of 4"
        />
      )}
      {sub === 1 && (
        <DefenseField
          questionLabel="Follow-up 1"
          questionText={followUps[0]}
          value={state.defenseQ1}
          setValue={(v) => dispatch({ type: "SET_DEFENSE_Q1", value: v })}
          minChars={DEFENSE_MIN_FOLLOWUP}
          saveStatus={saveStatus}
          onBack={() => advanceTo(0)}
          onNext={() => advanceTo(2)}
          stepIndicator="2 of 4"
        />
      )}
      {sub === 2 && (
        <DefenseField
          questionLabel="Follow-up 2"
          questionText={followUps[1]}
          value={state.defenseQ2}
          setValue={(v) => dispatch({ type: "SET_DEFENSE_Q2", value: v })}
          minChars={DEFENSE_MIN_FOLLOWUP}
          saveStatus={saveStatus}
          onBack={() => advanceTo(1)}
          onNext={() => advanceTo(3)}
          stepIndicator="3 of 4"
        />
      )}
      {sub === 3 && (
        <DefenseField
          questionLabel="Follow-up 3"
          questionText={followUps[2]}
          value={state.defenseQ3}
          setValue={(v) => dispatch({ type: "SET_DEFENSE_Q3", value: v })}
          minChars={DEFENSE_MIN_FOLLOWUP}
          saveStatus={saveStatus}
          onBack={() => advanceTo(2)}
          onNext={handleSubmit}
          nextLabel="Submit defense for evaluation →"
          stepIndicator="4 of 4"
        />
      )}
      {sub === 4 && (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "var(--bg-2)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ display: "inline-flex", gap: 5, marginBottom: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  animation: `dotPulse 1.2s ease ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
          <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.7 }}>Evaluating your defense...</p>
          <p style={{ color: "var(--text-4)", fontSize: 12, marginTop: 8 }}>
            Reading all four responses. About 10 seconds.
          </p>
          {evaluator.error && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{evaluator.error.message}</p>
              <PrimaryBtn onClick={handleSubmit}>Try again</PrimaryBtn>
            </div>
          )}
        </div>
      )}
      {sub === 5 && evaluator.result && evaluator.result.judgment !== "crisis_flag" && (
        <DefenseResult
          result={evaluator.result}
          attemptNumber={evaluator.attemptNumber}
          onAccept={handleAcceptResult}
          onRevise={handleRevise}
          skill={skill}
        />
      )}
    </div>
  );
}

function DefenseField({ questionLabel, questionText, value, setValue, minChars, saveStatus, onBack, onNext, nextLabel, stepIndicator }) {
  return (
    <div className="au">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--pink)",
          }}
        >
          {questionLabel}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-4)" }}>{stepIndicator}</div>
      </div>
      <div
        style={{
          borderLeft: "3px solid var(--pink)",
          paddingLeft: 18,
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 15, color: "var(--text-1)", lineHeight: 1.8, fontStyle: "italic" }}>
          {questionText}
        </p>
      </div>
      <textarea
        rows={7}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write your response..."
        aria-label={questionLabel}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <CharCount text={value} min={minChars} />
          <SaveStatus status={saveStatus} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onBack && <GhostBtn onClick={onBack}>← back</GhostBtn>}
          <PrimaryBtn onClick={onNext} disabled={value.trim().length < minChars}>
            {nextLabel || "Continue →"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function DefenseResult({ result, attemptNumber, onAccept, onRevise, skill }) {
  const isFullyEngaged = result.judgment === "engaged";
  const isPartial = result.judgment === "partially_engaged";
  const isEvaded = result.judgment === "evaded";
  const canStillVerify = !isEvaded; // Evaded = must revise; partially engaged = can choose

  let title, color, intro;
  if (isFullyEngaged) {
    title = "Substantively Engaged";
    color = "var(--green)";
    intro = "The evaluator found your defense met the bar across all four responses.";
  } else if (isPartial) {
    title = "Partially Engaged";
    color = "var(--gold)";
    intro = "The evaluator found real engagement on most prompts, but at least one was answered with vague generalities or sidestepped.";
  } else {
    title = "Defense Evaded";
    color = "var(--red)";
    intro = "The evaluator found the defense consistently sidestepped the prompts. You'll need to revise before this skill can be verified.";
  }

  return (
    <div className="au">
      <div
        style={{
          background: "var(--bg-2)",
          border: `1px solid ${color}`,
          borderRadius: "var(--radius-lg)",
          padding: "26px 28px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color,
            marginBottom: 10,
          }}
        >
          Evaluation
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-1)",
            marginBottom: 14,
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85, marginBottom: 18 }}>{intro}</p>

        {result.observation && (
          <div
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-4)",
                marginBottom: 8,
              }}
            >
              Observation
            </div>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85 }}>
              {result.observation}
            </p>
          </div>
        )}

        {attemptNumber > 1 && (
          <p style={{ marginTop: 14, fontSize: 11, color: "var(--text-4)", fontStyle: "italic" }}>
            Revision attempt {attemptNumber}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {canStillVerify && (
          <PrimaryBtn onClick={onAccept} style={{ flex: 1, padding: "13px" }}>
            {isFullyEngaged ? "Get verified →" : "Accept and verify →"}
          </PrimaryBtn>
        )}
        {!isFullyEngaged && (
          <GhostBtn onClick={onRevise} style={{ flex: canStillVerify ? "0 0 auto" : 1, padding: "12px 20px" }}>
            {isEvaded ? "Revise my defense" : "Revise instead"}
          </GhostBtn>
        )}
      </div>

      {isEvaded && (
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-3)", lineHeight: 1.7, textAlign: "center" }}>
          The evaluator can be wrong. If you genuinely believe you engaged the prompts and the
          evaluator missed it, revise once with sharper specifics. If you still get an evaded
          judgment after that, you can email support and a human will review.
        </p>
      )}
    </div>
  );
}

function VerifiedStep({ skill, slug, displayName, onDone }) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareSent, setShareSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/v/${slug}` : "";

  async function handleShare() {
    if (!shareEmail.trim()) return;
    const session = (await supabase.auth.getSession()).data.session;
    await fetch("/api/share-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ slug, recipientEmail: shareEmail.trim() }),
    });
    setShareSent(true);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="au">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--green-soft)",
            border: "1px solid rgba(74,171,106,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: 22,
          }}
        >
          ✓
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>
          {skill.name}
        </h2>
        <p style={{ color: "var(--text-3)", fontSize: 14 }}>Not just learned. Proved.</p>
      </div>

      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          Your verification URL
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--gold)",
            fontFamily: "monospace",
            wordBreak: "break-all",
            marginBottom: 14,
          }}
        >
          {verifyUrl}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <GhostBtn onClick={handleCopy}>{copied ? "✓ Copied" : "Copy URL"}</GhostBtn>
          <a
            href={`/api/verification-pdf?slug=${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 24px",
              border: "1px solid var(--border-3)",
              borderRadius: "var(--radius)",
              color: "var(--text-3)",
              fontSize: 14,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Download PDF
          </a>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 24px",
              border: "1px solid var(--border-3)",
              borderRadius: "var(--radius)",
              color: "var(--text-3)",
              fontSize: 14,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View public page
          </a>
        </div>
      </div>

      {!shareSent ? (
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-1)", marginBottom: 8 }}>
            Share with one person
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12, lineHeight: 1.7 }}>
            Send this verification to one person — a parent, mentor, coach, or someone who will appreciate the work.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="their.email@example.com"
              style={{ flex: 1 }}
            />
            <PrimaryBtn onClick={handleShare} disabled={!shareEmail.includes("@")}>Send</PrimaryBtn>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--green-soft)",
            border: "1px solid rgba(74,171,106,0.3)",
            borderRadius: "var(--radius-lg)",
            padding: "16px",
            marginBottom: 18,
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          ✓ Sent. They'll get a clean email with your verification.
        </div>
      )}

      <PrimaryBtn onClick={onDone} full>
        Back to Dashboard →
      </PrimaryBtn>
    </div>
  );
}

// Shown after Defense is submitted for Blueprint's review
function PendingReviewStep({ skill, onDone }) {
  return (
    <div className="au" style={{ textAlign: "center", paddingTop: 20 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--gold-soft)",
          border: "1px solid rgba(232,184,75,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 26,
        }}
      >
        ⏳
      </div>

      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--gold)",
          marginBottom: 10,
        }}
      >
        Submitted for review
      </h2>

      <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85, marginBottom: 8, maxWidth: 420, margin: "0 auto 16px" }}>
        Your {skill.name} submission is now in the review queue. A veteran educator will read
        every word you wrote and respond within 5 business days.
      </p>

      <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
        You'll get an email when it's been reviewed — either with your verification or with
        specific feedback on what to strengthen.
      </p>

      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          marginBottom: 28,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-4)",
            marginBottom: 12,
          }}
        >
          What happens next
        </div>
        {[
          "Your reviewer reads your Hook, Science, Challenge, and all four Defense responses.",
          "If your work meets the standard, your verification is issued and you'll get an email with your shareable URL.",
          "If something needs strengthening, you'll get specific written feedback and can revise and resubmit.",
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--gold-soft)",
                border: "1px solid rgba(232,184,75,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--gold)",
              }}
            >
              {i + 1}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>

      <PrimaryBtn onClick={onDone} full>
        Back to Dashboard →
      </PrimaryBtn>
    </div>
  );
}
