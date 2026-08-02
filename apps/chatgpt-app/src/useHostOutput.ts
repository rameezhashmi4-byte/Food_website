import { useEffect, useState } from "react";
import { readToolOutput } from "./openaiBridge.js";

/**
 * Reads the host-provided tool output once on mount, and re-reads it if the
 * host later dispatches `openai:set_globals` (the documented convention for
 * "the widget's inputs changed") - falling back to demo data when there's
 * no host at all (e.g. `npm run dev`).
 */
export function useHostOutput<T>(demoFallback: T): T {
  const [output, setOutput] = useState<T>(() => readToolOutput<T>() ?? demoFallback);

  useEffect(() => {
    function handleUpdate() {
      const next = readToolOutput<T>();
      if (next) setOutput(next);
    }
    window.addEventListener("openai:set_globals", handleUpdate);
    return () => window.removeEventListener("openai:set_globals", handleUpdate);
  }, []);

  return output;
}
