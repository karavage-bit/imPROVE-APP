// useDefenseEval — submits a complete Defense and gets back a structured judgment.
// Single API call, with timeout, retry, and abort handling.

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

export function useDefenseEval({ skillId }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { judgment, observation }
  const [error, setError] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const abortRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const submit = useCallback(
    async ({ initial, q1, q2, q3 }) => {
      setSubmitting(true);
      setError(null);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timeoutId = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

      let attempt = 0;
      let lastError = null;

      while (attempt < MAX_RETRIES) {
        attempt++;
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const res = await fetch("/api/evaluate-defense", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              skillId,
              initial,
              q1,
              q2,
              q3,
              attemptNumber,
            }),
            signal: ctrl.signal,
          });

          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            const err = new Error(`API error: ${res.status}`);
            err.status = res.status;
            err.body = errBody;
            throw err;
          }

          clearTimeout(timeoutId);
          const data = await res.json();
          if (!isMountedRef.current) return;

          setResult({ judgment: data.judgment, observation: data.observation });
          setSubmitting(false);
          return data;
        } catch (e) {
          lastError = e;

          if (e.name === "AbortError" && !isMountedRef.current) {
            clearTimeout(timeoutId);
            return;
          }
          if (e.status >= 400 && e.status < 500 && e.status !== 429) break;
          if (attempt < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;

      let userMsg = "Connection issue. Please try again.";
      if (lastError?.status === 429) userMsg = "Too many submissions right now. Wait a moment and try again.";
      else if (lastError?.status === 401 || lastError?.status === 403) userMsg = "Authentication issue. Please refresh and try again.";
      else if (lastError?.status >= 500) userMsg = "Our evaluator is temporarily unavailable. Please try again in a minute.";
      else if (lastError?.name === "AbortError") userMsg = "Request timed out. Please try again.";

      setError({ message: userMsg, canRetry: true });
      setSubmitting(false);
    },
    [skillId, attemptNumber]
  );

  const retry = useCallback(() => {
    setError(null);
  }, []);

  const reviseAndResubmit = useCallback(() => {
    setAttemptNumber((n) => n + 1);
    setResult(null);
    setError(null);
  }, []);

  return {
    submit,
    submitting,
    result,
    error,
    retry,
    reviseAndResubmit,
    attemptNumber,
  };
}
