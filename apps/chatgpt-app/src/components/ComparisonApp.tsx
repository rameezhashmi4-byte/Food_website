import type { ComparisonToolOutput } from "../types.js";
import { formatGbp, humanize, humanizeList } from "../lib/format.js";

export interface ComparisonAppProps {
  output?: ComparisonToolOutput;
}

const AWARD_LABELS: Array<{ key: keyof ComparisonToolOutput; label: string }> = [
  { key: "bestOverallMatch", label: "Best overall match" },
  { key: "bestValue", label: "Best value" },
  { key: "bestAtmosphere", label: "Best atmosphere" },
  { key: "bestForGroup", label: "Best for the group" },
];

export function ComparisonApp({ output }: ComparisonAppProps) {
  if (!output) {
    return (
      <div className="bj-app">
        <p className="bj-empty">Waiting for a comparison…</p>
      </div>
    );
  }

  const { items } = output;
  if (items.length === 0) {
    return (
      <div className="bj-app">
        <p className="bj-empty">Nothing to compare yet.</p>
      </div>
    );
  }

  function awardsFor(restaurantId: string): string[] {
    return AWARD_LABELS.filter(({ key }) => output![key] === restaurantId).map(({ label }) => label);
  }

  return (
    <div className="bj-app">
      <div className="bj-header">
        <h1>Comparing your shortlist</h1>
        <span className="bj-count">near {output.locationLabel}</span>
      </div>

      <table className="bj-comparison-table">
        <thead>
          <tr>
            <th scope="col">&nbsp;</th>
            {items.map(({ card }) => (
              <th scope="col" key={card.id}>
                {card.name}
                {awardsFor(card.id).map((award) => (
                  <div className="bj-award" key={award}>
                    {award}
                  </div>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Match score</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.matchScorePercent}%</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Distance</th>
            {items.map(({ card }) => (
              <td key={card.id}>
                {card.distanceKm}km · {card.travelTimeMinutes} min
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Price</th>
            {items.map(({ card }) => (
              <td key={card.id}>~{formatGbp(card.pricePerPersonGbp)} pp</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Cuisine</th>
            {items.map(({ card }) => (
              <td key={card.id}>{humanizeList(card.cuisines)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Atmosphere</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.atmosphere.length > 0 ? humanizeList(card.atmosphere) : "—"}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Facilities</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.facilities.length > 0 ? humanizeList(card.facilities, 4) : "—"}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Offers</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.offers.length > 0 ? card.offers.map((o) => o.title).join(", ") : "None right now"}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Rating</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.rating ? `★ ${card.rating} (${card.reviewCount})` : "Not yet rated"}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Dietary suitability</th>
            {items.map(({ card }) => (
              <td key={card.id}>{card.dietaryOptions.length > 0 ? humanizeList(card.dietaryOptions, 5) : "—"}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Trade-offs</th>
            {items.map((item) => (
              <td key={item.card.id}>
                {item.tradeOffs.length > 0 ? (
                  item.tradeOffs.map((tradeOff) => (
                    <div className="bj-tradeoff" key={tradeOff}>
                      {humanize(tradeOff)}
                    </div>
                  ))
                ) : (
                  <span>Meets everything you asked for</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
