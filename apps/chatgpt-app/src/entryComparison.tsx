import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { ComparisonApp } from "./components/ComparisonApp.js";
import { useHostOutput } from "./useHostOutput.js";
import { DEMO_COMPARISON } from "./demoData.js";
import type { ComparisonToolOutput } from "./types.js";

function Root() {
  const output = useHostOutput<ComparisonToolOutput>(DEMO_COMPARISON);
  return <ComparisonApp output={output} />;
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
