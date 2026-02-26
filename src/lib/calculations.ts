/**
 * Pricing calculation engine.
 * Single source of truth for ALL pricing maths in the entire app.
 * Every page, every export, every view uses these functions.
 * Never duplicate these calculations elsewhere.
 *
 * All monetary values in GBP (£).
 */

export function calculateOverheadPerDay(
  totalMonthlyOverhead: number,
  annualBillableDays: number
): number {
  const annualOverhead = totalMonthlyOverhead * 12;
  return annualOverhead / annualBillableDays;
}

export function calculateTotalCostPerDay(
  baseCostDay: number,
  overheadPerDay: number
): number {
  return baseCostDay + overheadPerDay;
}

export function calculateMarkupAmount(
  totalCostDay: number,
  markupPct: number
): number {
  return totalCostDay * markupPct;
}

export function calculateClientDayRate(
  baseCostDay: number,
  overheadPerDay: number,
  markupPct: number
): number {
  const totalCost = calculateTotalCostPerDay(baseCostDay, overheadPerDay);
  return totalCost + calculateMarkupAmount(totalCost, markupPct);
}

export function calculateClientHourlyRate(clientDayRate: number): number {
  return clientDayRate / 8;
}

export function calculateLineInvestment(
  roleAllocations: { roleId: string; days: number }[],
  roles: { id: string; baseCostDay: number; markupPct: number }[],
  overheadPerDay: number
): number {
  return roleAllocations.reduce((total, alloc) => {
    const role = roles.find((r) => r.id === alloc.roleId);
    if (!role) return total;
    return (
      total +
      alloc.days *
        calculateClientDayRate(role.baseCostDay, overheadPerDay, role.markupPct)
    );
  }, 0);
}

export function calculateLineInternalCost(
  roleAllocations: { roleId: string; days: number }[],
  roles: { id: string; baseCostDay: number }[],
  overheadPerDay: number
): number {
  return roleAllocations.reduce((total, alloc) => {
    const role = roles.find((r) => r.id === alloc.roleId);
    if (!role) return total;
    return (
      total +
      alloc.days * calculateTotalCostPerDay(role.baseCostDay, overheadPerDay)
    );
  }, 0);
}

export function calculateLineHours(
  roleAllocations: { days: number }[]
): number {
  return roleAllocations.reduce(
    (total, alloc) => total + alloc.days * 8,
    0
  );
}

export function calculateGrossProfit(
  totalInvestment: number,
  totalInternalCost: number
): number {
  return totalInvestment - totalInternalCost;
}

export function calculateProfitMargin(
  grossProfit: number,
  totalInvestment: number
): number {
  if (totalInvestment === 0) return 0;
  return (grossProfit / totalInvestment) * 100;
}
