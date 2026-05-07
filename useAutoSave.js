// useAutoSave — debounced persistence to Supabase
// Saves textarea content 800ms after user stops typing.

import { useEffect, useRef, useState } from "react";
import { saveProgress } from "../lib/supabase";

export function useAutoSave({ userId, skillId, skillVersion, step, value }) {
  const [status, setStatus] = useState("idle");
  const lastSaved = useRef(value);
  const timer = useRef(null);

  useEffect(() => {
    if (!userId) return;
    if (value === lastSaved.current) return;
    if (!value || value.trim().length === 0) return;

    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      try {
        const { error } = await saveProgress({
          userId,
          skillId,
          skillVersion,
          step,
          responseText: value,
          status: "in_progress",
        });
        if (error) throw error;
        lastSaved.current = value;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (e) {
        console.error("Auto-save failed:", e);
        setStatus("error");
      }
    }, 800);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, userId, skillId, skillVersion, step]);

  return { status };
}
