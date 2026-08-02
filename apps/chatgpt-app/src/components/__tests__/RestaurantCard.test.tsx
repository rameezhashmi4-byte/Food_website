import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RestaurantCard } from "../RestaurantCard.js";
import { makeCard } from "./fixtures.js";

describe("RestaurantCard", () => {
  beforeEach(() => {
    vi.stubGlobal("open", vi.fn());
  });

  it("shows the core recommendation fields", () => {
    render(<RestaurantCard card={makeCard()} />);

    expect(screen.getByText("Flame & Fork")).toBeInTheDocument();
    expect(screen.getByText("87% match")).toBeInTheDocument();
    expect(screen.getByText("Open now")).toBeInTheDocument();
    expect(screen.getByText(/★ 4.6 \(812 reviews\)/)).toBeInTheDocument();
    expect(screen.getByText(/Free starter for groups of 4\+/)).toBeInTheDocument();
    expect(screen.getByText("Serves burgers")).toBeInTheDocument();
  });

  it("expands to show extra details only after 'View details' is clicked", async () => {
    const user = userEvent.setup();
    render(<RestaurantCard card={makeCard()} />);

    expect(screen.queryByTestId("restaurant-card-details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByTestId("restaurant-card-details")).toBeInTheDocument();
    expect(screen.getByText(/12 Dingwall Road, Croydon/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.queryByTestId("restaurant-card-details")).not.toBeInTheDocument();
  });

  it("keeps Save later, Book and Order disabled rather than pretending they work", () => {
    render(<RestaurantCard card={makeCard()} />);
    expect(screen.getByRole("button", { name: "Save later" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Book" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Order" })).toBeDisabled();
  });

  it("opens a real maps link when Directions is clicked", async () => {
    const user = userEvent.setup();
    render(<RestaurantCard card={makeCard()} />);
    await user.click(screen.getByRole("button", { name: "Directions" }));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("51.3757,-0.0921"), "_blank", "noopener,noreferrer");
  });

  it("only shows the Compare button when compareEnabled is true", () => {
    const { rerender } = render(<RestaurantCard card={makeCard()} />);
    expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();

    rerender(<RestaurantCard card={makeCard()} compareEnabled onToggleCompare={() => {}} />);
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
  });

  it("calls onToggleCompare when Compare is clicked", async () => {
    const user = userEvent.setup();
    const onToggleCompare = vi.fn();
    render(<RestaurantCard card={makeCard()} compareEnabled onToggleCompare={onToggleCompare} />);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(onToggleCompare).toHaveBeenCalledTimes(1);
  });
});
