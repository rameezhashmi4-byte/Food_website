import type { RestaurantCard } from "../types.js";
import { openDirections } from "../openaiBridge.js";

export interface ActionButtonsProps {
  card: RestaurantCard;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  compareEnabled?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: () => void;
}

/**
 * Actions that aren't wired up yet (Save later, Book, Order) are shown
 * disabled rather than pretending to do something - Stage 2 has no auth,
 * persistence, or real booking/ordering integration. Directions always
 * works (it's just a maps link); View details and Compare are fully real.
 */
export function ActionButtons({ card, detailsOpen, onToggleDetails, compareEnabled, isSelectedForCompare, onToggleCompare }: ActionButtonsProps) {
  return (
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
      <button
        type="button"
        className="bj-btn"
        onClick={() => openDirections(card.location, card.name)}
      >
        Directions
      </button>
      <button type="button" className="bj-btn" disabled title="Saved restaurants are coming in a future update">
        Save later
      </button>
      <button type="button" className="bj-btn" disabled title="Booking isn't wired up yet">
        Book
      </button>
      <button type="button" className="bj-btn" disabled title="Ordering isn't wired up yet">
        Order
      </button>
    </div>
  );
}
