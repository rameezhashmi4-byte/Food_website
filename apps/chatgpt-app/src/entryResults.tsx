import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { RestaurantResultsApp } from "./components/RestaurantResultsApp.js";
import { useHostOutput } from "./useHostOutput.js";
import { DEMO_RESULTS } from "./demoData.js";
import type { ResultsToolOutput, SurpriseToolOutput } from "./types.js";

function Root() {
  const output = useHostOutput<ResultsToolOutput | SurpriseToolOutput>(DEMO_RESULTS);
  return <RestaurantResultsApp output={output} />;
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
