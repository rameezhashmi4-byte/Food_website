import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RestaurantCard } from "../RestaurantCard.js";
import { makeCard } from "./fixtures.js";
import type { RestaurantCard as RestaurantCardData } from "../../types.js";

/** Small helper to control exactly when a mocked host call resolves, so we
 * can assert the optimistic UI state *before* the "server" responds. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("RestaurantCard", () => {
  beforeEach(() => {
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    delete (window as { openai?: unknown }).openai;
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

  it("keeps Book and Order disabled - no real booking/ordering integration exists yet", () => {
    render(<RestaurantCard card={makeCard()} />);
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

  describe("Save (auth-aware)", () => {
    it("is visible and clickable when saved-status is not yet known (no isSaved on the card)", () => {
      render(<RestaurantCard card={makeCard()} />);
      const saveButton = screen.getByRole("button", { name: "Save later" });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeEnabled();
    });

    it("renders as already-saved when the initial tool output includes isSaved: true", () => {
      const card: RestaurantCardData & { isSaved: boolean } = { ...makeCard(), isSaved: true };
      render(<RestaurantCard card={card} />);
      expect(screen.getByRole("button", { name: "Saved ✓" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save later" })).not.toBeInTheDocument();
    });

    it("shows the connect-account prompt (not a fake 'saved' state) when there's no host to call - the anonymous/outside-ChatGPT case", async () => {
      const user = userEvent.setup();
      // No window.openai at all - mirrors an anonymous session / running outside a real ChatGPT host.
      render(<RestaurantCard card={makeCard()} />);

      await user.click(screen.getByRole("button", { name: "Save later" }));

      expect(await screen.findByText(/Connect your BiteJoy account to save this/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Connect account" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Saved ✓" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save later" })).toBeInTheDocument();
    });

    it("sends a follow-up message to connect the account, rather than faking an in-widget auth flow", async () => {
      const user = userEvent.setup();
      const sendFollowUpMessage = vi.fn();
      window.openai = { sendFollowUpMessage };

      render(<RestaurantCard card={makeCard()} />);
      await user.click(screen.getByRole("button", { name: "Save later" }));
      await user.click(await screen.findByRole("button", { name: "Connect account" }));

      expect(sendFollowUpMessage).toHaveBeenCalledWith({ prompt: "I'd like to connect my BiteJoy account" });
    });

    it("uses optimistic UI on save and performs a real rollback (not just a delayed final state) when the call fails", async () => {
      const user = userEvent.setup();
      const { promise, resolve } = deferred<unknown>();
      const callTool = vi.fn().mockReturnValue(promise);
      window.openai = { callTool };

      render(<RestaurantCard card={makeCard()} />);
      await user.click(screen.getByRole("button", { name: "Save later" }));

      // Flips immediately - before the "server" has responded at all.
      expect(screen.getByRole("button", { name: "Saved ✓" })).toBeInTheDocument();
      expect(screen.queryByText(/Connect your BiteJoy account/)).not.toBeInTheDocument();
      expect(callTool).toHaveBeenCalledWith("save_restaurant", { restaurantId: "r_flame_fork" });

      // Now the tool comes back isError: true (the documented "not authenticated" shape).
      resolve({ isError: true, content: [{ type: "text", text: "This needs a connected BiteJoy account..." }] });

      expect(await screen.findByRole("button", { name: "Save later" })).toBeInTheDocument();
      expect(screen.getByText(/Connect your BiteJoy account to save this/)).toBeInTheDocument();
    });

    it("flips to Saved ✓ on a real successful save, and can be removed again", async () => {
      const user = userEvent.setup();
      const callTool = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Saved Flame & Fork." }] });
      window.openai = { callTool };

      render(<RestaurantCard card={makeCard()} />);
      await user.click(screen.getByRole("button", { name: "Save later" }));

      expect(await screen.findByRole("button", { name: "Saved ✓" })).toBeInTheDocument();
      expect(callTool).toHaveBeenCalledWith("save_restaurant", { restaurantId: "r_flame_fork" });
      expect(screen.queryByText(/Connect your BiteJoy account/)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Saved ✓" }));
      expect(await screen.findByRole("button", { name: "Save later" })).toBeInTheDocument();
      expect(callTool).toHaveBeenCalledWith("remove_saved_restaurant", { restaurantId: "r_flame_fork" });
    });

    it("rolls back a failed remove and shows the connect prompt too", async () => {
      const user = userEvent.setup();
      const callTool = vi.fn();
      window.openai = { callTool };

      const card: RestaurantCardData & { isSaved: boolean } = { ...makeCard(), isSaved: true };
      render(<RestaurantCard card={card} />);

      callTool.mockResolvedValueOnce({ isError: true, content: [{ type: "text", text: "This needs a connected BiteJoy account..." }] });
      await user.click(screen.getByRole("button", { name: "Saved ✓" }));

      expect(await screen.findByRole("button", { name: "Saved ✓" })).toBeInTheDocument();
      expect(screen.getByText(/Connect your BiteJoy account to save this/)).toBeInTheDocument();
      expect(callTool).toHaveBeenCalledWith("remove_saved_restaurant", { restaurantId: "r_flame_fork" });
    });
  });
});
