/** Generate a URL-safe slug from client name and project name */
export function generateSlug(clientName: string, projectName: string): string {
  const raw = `${clientName}-${projectName}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Format a number as GBP currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number as GBP with decimals */
export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a percentage (0.30 → "30%") */
export function formatPercent(decimal: number): string {
  return `${Math.round(decimal * 100)}%`;
}

/** Format a day range like "1-2 days" or "Variable" */
export function formatDayRange(
  min: number | null,
  max: number | null
): string {
  if (min === null && max === null) return "Variable";
  if (min === max) return `${min} day${min === 1 ? "" : "s"}`;
  return `${min}-${max} days`;
}

/** Abbreviate role titles for compact column headers */
export function abbreviateRole(title: string): string {
  const map: Record<string, string> = {
    "Founder/Technical Director": "Founder",
    "Senior Developer": "Sr Dev",
    "Project Manager": "PM",
    "Senior Designer": "Sr Design",
    "Mid-Level Designer": "Mid Design",
    "Account Manager": "AM",
    "Mid-Level Developer": "Mid Dev",
  };
  return map[title] ?? title.split(" ")[0];
}

/** Format a number as days/hours display (hide 0, show 1 decimal if needed) */
export function formatDays(value: number): string {
  if (!value) return "";
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}
