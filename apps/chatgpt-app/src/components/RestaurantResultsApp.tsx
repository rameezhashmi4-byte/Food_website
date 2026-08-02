import { useMemo, useState } from "react";
import type { ResultsToolOutput, SurpriseToolOutput } from "../types.js";
import { isSurpriseOutput } from "../types.js";
import { RestaurantCard } from "./RestaurantCard.js";
import { callHostTool, sendFollowUpMessage } from "../openaiBridge.js";

export interface RestaurantResultsAppProps {
  output?: ResultsToolOutput | SurpriseToolOutput;
}

const MAX_COMPARE = 4;

export function RestaurantResultsApp({ output }: RestaurantResultsAppProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [compareRequested, setCompareRequested] = useState(false);

  const cards = useMemo(() => {
    if (!output) return [];
    return isSurpriseOutput(output) ? [output.recommendation] : output.recommendations;
  }, [output]);

  const compareEnabled = cards.length >= 2;

  function toggleCompare(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((existing) => existing !== id);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, id];
    });
  }

  async function requestComparison() {
    setCompareRequested(true);
    const calledHost = await callHostTool("compare_restaurants", { restaurantIds: selected });
    if (!calledHost) {
      const names = cards.filter((c) => selected.includes(c.id)).map((c) => c.name);
      sendFollowUpMessage(`Compare ${names.join(", ")}`);
    }
  }

  if (!output) {
    return (
      <div className="bj-app">
        <p className="bj-empty">Waiting for restaurant results…</p>
      </div>
    );
  }

  return (
    <div className="bj-app">
      <div className="bj-header">
        <h1>BiteJoy recommendations</h1>
        <span className="bj-count">
          {cards.length} near {output.locationLabel}
        </span>
      </div>

      {cards.length === 0 ? (
        <p className="bj-empty">No strong matches yet - try loosening the budget, radius or a required facility.</p>
      ) : (
        <div className="bj-grid">
          {cards.map((card) => (
            <RestaurantCard
              key={card.id}
              card={card}
              compareEnabled={compareEnabled}
              isSelectedForCompare={selected.includes(card.id)}
              onToggleCompare={() => toggleCompare(card.id)}
            />
          ))}
        </div>
      )}

      {selected.length >= 2 ? (
        <div className="bj-compare-bar">
          <div className="bj-compare-bar-inner">
            <span>{selected.length} selected</span>
            <button type="button" className="bj-btn bj-btn-primary" onClick={requestComparison} disabled={compareRequested}>
              {compareRequested ? "Comparing…" : "Compare selected"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
