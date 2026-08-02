import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RestaurantResultsApp } from "../RestaurantResultsApp.js";
import { makeCard } from "./fixtures.js";
import type { ResultsToolOutput, SurpriseToolOutput } from "../../types.js";

describe("RestaurantResultsApp", () => {
  it("shows a waiting state with no output", () => {
    render(<RestaurantResultsApp />);
    expect(screen.getByText(/Waiting for restaurant results/)).toBeInTheDocument();
  });

  it("shows an empty state when there are zero recommendations", () => {
    const output: ResultsToolOutput = { mode: "search", locationLabel: "Croydon", recommendations: [], count: 0 };
    render(<RestaurantResultsApp output={output} />);
    expect(screen.getByText(/No strong matches yet/)).toBeInTheDocument();
  });

  it("renders one card per recommendation for a normal search result", () => {
    const output: ResultsToolOutput = {
      mode: "search",
      locationLabel: "Croydon",
      recommendations: [makeCard(), makeCard({ id: "r_2", name: "Wok This Way" })],
      count: 2,
    };
    render(<RestaurantResultsApp output={output} />);
    expect(screen.getAllByTestId("restaurant-card")).toHaveLength(2);
    expect(screen.getByText("Wok This Way")).toBeInTheDocument();
  });

  it("renders exactly one card for a surprise_me result", () => {
    const output: SurpriseToolOutput = { mode: "surprise_me", locationLabel: "Croydon", recommendation: makeCard() };
    render(<RestaurantResultsApp output={output} />);
    expect(screen.getAllByTestId("restaurant-card")).toHaveLength(1);
  });

  it("shows the compare bar only once 2 or more cards are selected, and calls the host bridge", async () => {
    const user = userEvent.setup();
    const callTool = vi.fn().mockResolvedValue(undefined);
    window.openai = { callTool };

    const output: ResultsToolOutput = {
      mode: "search",
      locationLabel: "Croydon",
      recommendations: [makeCard(), makeCard({ id: "r_2", name: "Wok This Way" }), makeCard({ id: "r_3", name: "Spice Junction" })],
      count: 3,
    };
    render(<RestaurantResultsApp output={output} />);

    const compareButtons = screen.getAllByRole("button", { name: "Compare" });
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    await user.click(compareButtons[0]!);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    await user.click(compareButtons[1]!);
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compare selected" }));
    expect(callTool).toHaveBeenCalledWith("compare_restaurants", { restaurantIds: ["r_flame_fork", "r_2"] });

    delete (window as { openai?: unknown }).openai;
  });
});
