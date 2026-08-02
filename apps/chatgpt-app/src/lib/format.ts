export function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

export function humanizeList(values: string[], max = 3): string {
  return values.slice(0, max).map(humanize).join(", ");
}

export function formatGbp(amount: number): string {
  return Number.isInteger(amount) ? `£${amount}` : `£${amount.toFixed(2)}`;
}

export interface OpeningStatusMeta {
  label: string;
  className: string;
}

const OPENING_STATUS_META: Record<string, OpeningStatusMeta> = {
  open_now: { label: "Open now", className: "bj-status-open" },
  closing_soon: { label: "Closing soon", className: "bj-status-soon" },
  opens_later_today: { label: "Opens later today", className: "bj-status-soon" },
  closed: { label: "Closed", className: "bj-status-closed" },
  unknown: { label: "Hours unknown", className: "bj-status-unknown" },
};

export function openingStatusMeta(status: string): OpeningStatusMeta {
  return OPENING_STATUS_META[status] ?? { label: humanize(status), className: "bj-status-unknown" };
}
