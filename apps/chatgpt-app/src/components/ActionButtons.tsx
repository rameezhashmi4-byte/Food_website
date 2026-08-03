import { useState } from "react";
import type { RestaurantCard } from "../types.js";
import { openDirections, callHostToolDetailed, sendFollowUpMessage } from "../openaiBridge.js";

export interface ActionButtonsProps {
  card: RestaurantCard;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  compareEnabled?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: () => void;
}

/**
 * The Stage 3 `save_restaurant`/`list_saved_restaurants` MCP tool contract
 * doesn't (yet, as far as this widget can verify) put an `isSaved` flag on
 * the card view JSON, and `src/types.ts` is a fixed wire contract this
 * widget doesn't own - so this widens the type locally, right where it's
 * used, instead of editing that shared file. If the field never arrives,
 * `isSaved` is just always `undefined` here and the "unknown" branch below
 * is what renders.
 */
type SavableCard = RestaurantCard & { isSaved?: boolean };

type SaveStatus = "unsaved" | "saved";
type PendingAction = "save" | "remove" | null;

/**
 * Book and Order stay disabled - Stage 3 has no real booking/ordering
 * integration yet. Directions always works (it's just a maps link); View
 * details and Compare are fully real.
 *
 * Save is real now, but the widget has no documented, verified way to ask
 * "is this ChatGPT user authenticated with BiteJoy?" up front (see
 * docs/chatgpt-app.md's "Current limitations" and openaiBridge.ts) - so it
 * takes an optimistic-then-verify approach: flip to "Saved ✓" immediately
 * on click for responsiveness, call the real `save_restaurant` tool, and
 * roll the UI state back to unsaved (plus a friendly connect-account
 * prompt) if that call comes back `isError: true` - the one documented
 * failure mode these tools have for an unauthenticated caller. This is a
 * widget-local, ephemeral session: saved state lives only in React state
 * for the current render, never in localStorage/sessionStorage - the
 * server/database is the only real source of truth.
 */
export function ActionButtons({
  card,
  detailsOpen,
  onToggleDetails,
  compareEnabled,
  isSelectedForCompare,
  onToggleCompare,
}: ActionButtonsProps) {
  const savable = card as SavableCard;
  const [status, setStatus] = useState<SaveStatus>(savable.isSaved ? "saved" : "unsaved");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const isPending = pendingAction !== null;

  async function handleSave() {
    const previousStatus = status;
    setNeedsAuth(false);
    setStatus("saved"); // optimistic flip - rolled back below if the call fails
    setPendingAction("save");
    const { ok } = await callHostToolDetailed("save_restaurant", { restaurantId: card.id });
    setPendingAction(null);
    if (!ok) {
      setStatus(previousStatus); // real rollback, not just a delayed final state
      setNeedsAuth(true);
    }
  }

  async function handleRemove() {
    const previousStatus = status;
    setNeedsAuth(false);
    setStatus("unsaved"); // optimistic flip - rolled back below if the call fails
    setPendingAction("remove");
    const { ok } = await callHostToolDetailed("remove_saved_restaurant", { restaurantId: card.id });
    setPendingAction(null);
    if (!ok) {
      setStatus(previousStatus);
      setNeedsAuth(true);
    }
  }

  function handleConnectAccount() {
    // The widget runs sandboxed inside a ChatGPT iframe with no documented,
    // tested way to drive an OAuth popup itself - this hands off to the
    // host conversation rather than completing a real in-widget auth flow.
    sendFollowUpMessage("I'd like to connect my BiteJoy account");
  }

  return (
    <div className="bj-actions-wrap">
      <div className="bj-actions">
        <button type="button" className="bj-btn bj-btn-primary" onClick={onToggleDetails}>
          {detailsOpen ? "Hide details" : "View details"}
        </button>
        {compareEnabled ? (
          <button
            type="button"
            className={`bj-btn ${isSelectedForCompare ? "bj-btn-selected" : ""}`}
            onClick={onToggleCompare}
            aria-pressed={isSelectedForCompare}
          >
            {isSelectedForCompare ? "Selected ✓" : "Compare"}
          </button>
        ) : null}
        <button type="button" className="bj-btn" onClick={() => openDirections(card.location, card.name)}>
          Directions
        </button>
        {status === "saved" ? (
          <button
            type="button"
            className="bj-btn bj-btn-selected"
            onClick={handleRemove}
            disabled={isPending}
            aria-pressed={true}
            title="Remove from your saved restaurants"
          >
            Saved ✓
          </button>
        ) : (
          <button type="button" className="bj-btn" onClick={handleSave} disabled={isPending}>
            Save later
          </button>
        )}
        <button type="button" className="bj-btn" disabled title="Booking isn't wired up yet">
          Book
        </button>
        <button type="button" className="bj-btn" disabled title="Ordering isn't wired up yet">
          Order
        </button>
      </div>
      {needsAuth ? (
        <p className="bj-connect-prompt" role="status">
          Connect your BiteJoy account to save this.{" "}
          <button type="button" className="bj-link-btn" onClick={handleConnectAccount}>
            Connect account
          </button>
        </p>
      ) : null}
    </div>
  );
}
