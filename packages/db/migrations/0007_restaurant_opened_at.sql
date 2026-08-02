-- BiteJoy schema, migration 0007: track when a restaurant opened, to power
-- the "new openings" discovery mode added in Stage 2. Purely additive -
-- existing rows simply have opened_at = null (unknown), which the app
-- correctly treats as "not a new opening" rather than guessing.

alter table restaurants add column opened_at timestamptz;
