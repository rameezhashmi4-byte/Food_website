import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ComparisonApp } from "../ComparisonApp.js";
import { makeCard } from "./fixtures.js";
import type { ComparisonToolOutput } from "../../types.js";

describe("ComparisonApp", () => {
  it("shows a waiting state with no output", () => {
    render(<ComparisonApp />);
    expect(screen.getByText(/Waiting for a comparison/)).toBeInTheDocument();
  });

  it("renders a column per compared restaurant with award badges and trade-offs", () => {
    const output: ComparisonToolOutput = {
      locationLabel: "Croydon",
      items: [
        { card: makeCard(), meetsAllRequirements: true, tradeOffs: [] },
        {
          card: makeCard({ id: "r_2", name: "Wok This Way", matchScorePercent: 60 }),
          meetsAllRequirements: false,
          tradeOffs: ["missing_required_facilities"],
        },
      ],
      bestOverallMatch: "r_flame_fork",
      bestValue: "r_2",
    };
    render(<ComparisonApp output={output} />);

    expect(screen.getByRole("columnheader", { name: /Flame & Fork/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Wok This Way/ })).toBeInTheDocument();
    expect(screen.getByText("Best overall match")).toBeInTheDocument();
    expect(screen.getByText("Best value")).toBeInTheDocument();

    const tradeOffRow = screen.getByRole("row", { name: /Trade-offs/ });
    expect(within(tradeOffRow).getByText(/missing required facilities/)).toBeInTheDocument();
    expect(within(tradeOffRow).getByText(/Meets everything you asked for/)).toBeInTheDocument();
  });
});
