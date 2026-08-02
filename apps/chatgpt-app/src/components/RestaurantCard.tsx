import { useState } from "react";
import type { RestaurantCard as RestaurantCardData } from "../types.js";
import { formatGbp, humanize, humanizeList, openingStatusMeta } from "../lib/format.js";
import { ActionButtons } from "./ActionButtons.js";

export interface RestaurantCardProps {
  card: RestaurantCardData;
  compareEnabled?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: () => void;
}

export function RestaurantCard({ card, compareEnabled, isSelectedForCompare, onToggleCompare }: RestaurantCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const status = openingStatusMeta(card.openingStatus);
  const topReason = card.reasons[0];

  return (
    <article className="bj-card" data-testid="restaurant-card">
      {card.image ? (
        <img className="bj-card-image" src={card.image} alt={card.name} loading="lazy" />
      ) : (
        <div className="bj-card-image-placeholder">{card.cuisines[0] ? humanize(card.cuisines[0]) : card.name}</div>
      )}

      <div className="bj-card-body">
        <div className="bj-card-title-row">
          <h3 className="bj-card-title">{card.name}</h3>
          <span className="bj-match-score" title="How well this matches what you asked for">
            {card.matchScorePercent}% match
          </span>
        </div>

        <div className="bj-meta-line">
          <span>{humanizeList(card.cuisines)}</span>
          <span>·</span>
          <span>{card.area}</span>
          <span>·</span>
          <span>
            {card.distanceKm}km · {card.travelTimeMinutes} min {card.travelMode}
          </span>
        </div>

        <div className="bj-meta-line">
          <span>~{formatGbp(card.pricePerPersonGbp)} pp</span>
          {card.rating ? (
            <>
              <span>·</span>
              <span>
                ★ {card.rating} ({card.reviewCount} reviews)
              </span>
            </>
          ) : null}
          {card.isNewOpening ? (
            <>
              <span>·</span>
              <span>New opening</span>
            </>
          ) : null}
        </div>

        <span className={`bj-status ${status.className}`}>
          <span className="bj-status-dot" />
          {status.label}
        </span>

        {card.offers.length > 0 ? (
          <div className="bj-offer">
            {card.offers[0]!.title}
            {card.offers[0]!.isVerified ? "" : " (unverified)"}
          </div>
        ) : null}

        {card.popularDishes.length > 0 ? (
          <div className="bj-tag-row">
            {card.popularDishes.slice(0, 3).map((dish) => (
              <span className="bj-tag" key={dish}>
                {dish}
              </span>
            ))}
          </div>
        ) : null}

        {card.atmosphere.length > 0 || card.facilities.length > 0 ? (
          <div className="bj-tag-row">
            {card.atmosphere.slice(0, 2).map((a) => (
              <span className="bj-tag" key={a}>
                {humanize(a)}
              </span>
            ))}
            {card.facilities.slice(0, 3).map((f) => (
              <span className="bj-tag" key={f}>
                {humanize(f)}
              </span>
            ))}
          </div>
        ) : null}

        {topReason ? (
          <p className="bj-reason">{topReason}</p>
        ) : null}

        {detailsOpen ? (
          <div className="bj-details" data-testid="restaurant-card-details">
            {card.reasons.slice(1).map((reason) => (
              <p className="bj-reason" key={reason}>
                {reason}
              </p>
            ))}
            {card.popularFoodPrices.length > 0 ? (
              <p>
                <strong>Food:</strong>{" "}
                {card.popularFoodPrices.map((item) => `${item.name} (${formatGbp(item.priceGbp)})`).join(", ")}
              </p>
            ) : null}
            {card.popularDrinkPrices.length > 0 ? (
              <p>
                <strong>Drinks:</strong>{" "}
                {card.popularDrinkPrices.map((item) => `${item.name} (${formatGbp(item.priceGbp)})`).join(", ")}
              </p>
            ) : null}
            <p>{card.address}</p>
            <p className="bj-details-freshness">
              Source: {humanize(card.dataFreshness.source)} · {card.dataFreshness.label}
              {card.dataFreshness.isVerified ? "" : " · unverified"}
            </p>
          </div>
        ) : null}

        <ActionButtons
          card={card}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((open) => !open)}
          compareEnabled={compareEnabled}
          isSelectedForCompare={isSelectedForCompare}
          onToggleCompare={onToggleCompare}
        />
      </div>
    </article>
  );
}
