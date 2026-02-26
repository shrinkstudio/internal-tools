"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  calculateTotalCostPerDay,
  calculateClientDayRate,
  calculateGrossProfit,
  calculateProfitMargin,
} from "@/lib/calculations";
import {
  formatCurrencyExact,
  formatCurrency,
  abbreviateRole,
  formatDays,
} from "@/lib/utils";
import { SummaryCard } from "@/components/ui/SummaryCard";
import type {
  Project,
  ProjectVersion,
  Role,
  ScopePhase,
  ScopeDeliverable,
} from "@/lib/types";

type Props = {
  project: Project;
  currentVersion: ProjectVersion | null;
  roles: Role[];
  overheadPerDay: number;
};

export function BudgetClient({
  project,
  currentVersion,
  roles,
  overheadPerDay,
}: Props) {
  const [phases, setPhases] = useState<ScopePhase[]>(
    currentVersion?.snapshot?.phases ?? []
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createBrowserClient();

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // --- Notes auto-save (debounced) ---
  const saveNotes = useCallback(
    (updatedPhases: ScopePhase[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!currentVersion) return;
        await supabase
          .from("project_versions")
          .update({ snapshot: { phases: updatedPhases } })
          .eq("id", currentVersion.id);
      }, 500);
    },
    [currentVersion, supabase]
  );

  function handleNotesChange(
    phaseId: string,
    deliverableId: string,
    notes: string
  ) {
    setPhases((prev) => {
      const next = prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              deliverables: p.deliverables.map((d) =>
                d.id !== deliverableId
                  ? d
                  : { ...d, internal_notes: notes }
              ),
            }
      );
      saveNotes(next);
      return next;
    });
  }

  // --- Calculations ---
  function calcDeliverableHours(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce(
      (sum, days) => sum + (days || 0) * 8,
      0
    );
  }

  function calcDeliverableCost(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((sum, [roleId, days]) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || !days) return sum;
      return sum + days * calculateTotalCostPerDay(Number(role.base_cost_day), overheadPerDay);
    }, 0);
  }

  function calcDeliverableInvestment(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((sum, [roleId, days]) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || !days) return sum;
      return (
        sum +
        days *
          calculateClientDayRate(
            Number(role.base_cost_day),
            overheadPerDay,
            Number(role.markup_pct)
          )
      );
    }, 0);
  }

  function calcPhaseTotals(phase: ScopePhase) {
    let hours = 0;
    let cost = 0;
    for (const d of phase.deliverables) {
      hours += calcDeliverableHours(d);
      cost += calcDeliverableCost(d);
    }
    return { hours, cost };
  }

  // Grand totals
  let totalHours = 0;
  let totalCost = 0;
  let totalInvestment = 0;
  for (const phase of phases) {
    for (const d of phase.deliverables) {
      totalHours += calcDeliverableHours(d);
      totalCost += calcDeliverableCost(d);
      totalInvestment += calcDeliverableInvestment(d);
    }
  }

  const grossProfit = calculateGrossProfit(totalInvestment, totalCost);
  const profitMargin = calculateProfitMargin(grossProfit, totalInvestment);

  const marginColor =
    profitMargin > 30
      ? "text-green-400"
      : profitMargin >= 15
        ? "text-orange-400"
        : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">
            Internal Budget — {project.client_name}
          </p>
          <h1 className="text-xl font-semibold text-text">
            {project.project_name}
          </h1>
          <p className="mt-1 text-xs text-text-dim">
            Cost-only view · No markup · Hours for time tracking
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentVersion && (
            <span className="rounded-full bg-[#2a2a2a] px-2.5 py-0.5 text-xs text-text-muted">
              {currentVersion.name ?? `v${currentVersion.version_number}`}
            </span>
          )}
          <Link
            href={`/projects/${project.slug}`}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface transition-colors"
          >
            Scope
          </Link>
          <Link
            href={`/projects/${project.slug}/versions`}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface transition-colors"
          >
            Versions
          </Link>
        </div>
      </div>

      {/* Project summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard
          label="Total Internal Cost"
          value={formatCurrency(totalCost)}
        />
        <SummaryCard
          label="Total Client Investment"
          value={formatCurrency(totalInvestment)}
        />
        <SummaryCard
          label="Gross Profit"
          value={formatCurrency(grossProfit)}
        />
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs text-text-muted">Profit Margin</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${marginColor}`}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Budget phases */}
      {phases.map((phase) => {
        const phaseTotals = calcPhaseTotals(phase);
        if (phase.deliverables.length === 0) return null;

        return (
          <BudgetPhase
            key={phase.id}
            phase={phase}
            roles={roles}
            overheadPerDay={overheadPerDay}
            phaseTotalHours={phaseTotals.hours}
            phaseTotalCost={phaseTotals.cost}
            calcDeliverableHours={calcDeliverableHours}
            calcDeliverableCost={calcDeliverableCost}
            onNotesChange={handleNotesChange}
          />
        );
      })}

      {/* Grand total row */}
      <div className="flex items-center gap-6 rounded-lg border border-border bg-surface px-5 py-3">
        <div>
          <p className="text-xs text-text-muted">Total Hours</p>
          <p className="text-lg font-semibold text-text tabular-nums">
            {totalHours}
          </p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-xs text-text-muted">Total Internal Cost</p>
          <p className="text-lg font-semibold text-text tabular-nums">
            {formatCurrency(totalCost)}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Budget phase sub-component ---

function BudgetPhase({
  phase,
  roles,
  overheadPerDay,
  phaseTotalHours,
  phaseTotalCost,
  calcDeliverableHours,
  calcDeliverableCost,
  onNotesChange,
}: {
  phase: ScopePhase;
  roles: Role[];
  overheadPerDay: number;
  phaseTotalHours: number;
  phaseTotalCost: number;
  calcDeliverableHours: (d: ScopeDeliverable) => number;
  calcDeliverableCost: (d: ScopeDeliverable) => number;
  onNotesChange: (phaseId: string, deliverableId: string, notes: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center justify-between bg-surface px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-text-dim hover:text-text transition-colors text-xs"
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <h2 className="text-sm font-semibold text-text">{phase.name}</h2>
          <span className="text-xs text-text-dim">
            {phase.deliverables.length} deliverable
            {phase.deliverables.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <span className="text-text-muted">{phaseTotalHours} hrs</span>
          <span className="text-text font-medium">
            {formatCurrency(phaseTotalCost)}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="px-4 py-2 text-left text-xs font-medium text-text-dim min-w-[180px]">
                  Deliverable
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    colSpan={2}
                    className="px-1 py-2 text-center text-xs font-medium text-text-dim border-l border-border"
                    title={role.title}
                  >
                    {abbreviateRole(role.title)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim border-l border-border w-[60px]">
                  Hours
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-dim w-[90px]">
                  Cost
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-dim min-w-[140px]">
                  Notes
                </th>
              </tr>
              {/* Sub-header for Hours / Cost per role */}
              <tr className="border-b border-border bg-bg">
                <th />
                {roles.map((role) => (
                  <React.Fragment key={role.id}>
                    <th className="px-1 py-1 text-center text-[10px] font-normal text-text-dim border-l border-border">
                      Hrs
                    </th>
                    <th className="px-1 py-1 text-center text-[10px] font-normal text-text-dim">
                      Cost
                    </th>
                  </React.Fragment>
                ))}
                <th className="border-l border-border" />
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {phase.deliverables.map((d) => (
                <BudgetRow
                  key={d.id}
                  deliverable={d}
                  phaseId={phase.id}
                  roles={roles}
                  overheadPerDay={overheadPerDay}
                  totalHours={calcDeliverableHours(d)}
                  totalCost={calcDeliverableCost(d)}
                  onNotesChange={onNotesChange}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface">
                <td className="px-4 py-2 text-xs font-medium text-text-muted">
                  {phase.name} Total
                </td>
                {roles.map((role) => {
                  // Per-role phase totals
                  let roleHours = 0;
                  let roleCost = 0;
                  for (const d of phase.deliverables) {
                    const days = d.role_allocations[role.id] || 0;
                    roleHours += days * 8;
                    roleCost +=
                      days *
                      calculateTotalCostPerDay(
                        Number(role.base_cost_day),
                        overheadPerDay
                      );
                  }
                  return (
                    <React.Fragment key={role.id}>
                      <td className="px-1 py-2 text-center text-xs text-text-muted tabular-nums border-l border-border">
                        {roleHours > 0 ? roleHours : ""}
                      </td>
                      <td className="px-1 py-2 text-center text-xs text-text-muted tabular-nums">
                        {roleCost > 0 ? formatCurrencyExact(roleCost) : ""}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="px-3 py-2 text-right text-xs font-medium text-text tabular-nums border-l border-border">
                  {phaseTotalHours}
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium text-text tabular-nums">
                  {formatCurrencyExact(phaseTotalCost)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Budget row sub-component ---

function BudgetRow({
  deliverable,
  phaseId,
  roles,
  overheadPerDay,
  totalHours,
  totalCost,
  onNotesChange,
}: {
  deliverable: ScopeDeliverable;
  phaseId: string;
  roles: Role[];
  overheadPerDay: number;
  totalHours: number;
  totalCost: number;
  onNotesChange: (phaseId: string, deliverableId: string, notes: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-surface/30">
      <td className="px-4 py-1.5 text-sm text-text">{deliverable.name}</td>

      {roles.map((role) => {
        const days = deliverable.role_allocations[role.id] || 0;
        const hours = days * 8;
        const cost =
          days *
          calculateTotalCostPerDay(Number(role.base_cost_day), overheadPerDay);
        return (
          <React.Fragment key={role.id}>
            <td className="px-1 py-1.5 text-center text-xs text-text-muted tabular-nums border-l border-border">
              {hours > 0 ? hours : ""}
            </td>
            <td className="px-1 py-1.5 text-center text-xs text-text-muted tabular-nums">
              {cost > 0 ? formatCurrencyExact(cost) : ""}
            </td>
          </React.Fragment>
        );
      })}

      <td className="px-3 py-1.5 text-right text-xs text-text tabular-nums border-l border-border">
        {totalHours > 0 ? totalHours : ""}
      </td>
      <td className="px-3 py-1.5 text-right text-xs text-text font-medium tabular-nums">
        {totalCost > 0 ? formatCurrencyExact(totalCost) : ""}
      </td>

      {/* Notes */}
      <td className="px-3 py-1.5">
        {editingNotes ? (
          <input
            type="text"
            value={deliverable.internal_notes}
            onChange={(e) =>
              onNotesChange(phaseId, deliverable.id, e.target.value)
            }
            onBlur={() => setEditingNotes(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingNotes(false)}
            className="w-full bg-bg border border-border rounded px-2 py-0.5 text-xs text-text focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            className="text-xs text-text-dim cursor-pointer hover:text-text-muted transition-colors"
            onClick={() => setEditingNotes(true)}
          >
            {deliverable.internal_notes || "Add note..."}
          </span>
        )}
      </td>
    </tr>
  );
}

// Need React import for Fragment
import React from "react";
