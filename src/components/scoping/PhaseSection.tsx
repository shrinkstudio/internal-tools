"use client";

import { useState } from "react";
import { formatCurrency, formatCurrencyExact, abbreviateRole } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ScopePhase, ScopeDeliverable, Role } from "@/lib/types";
import { DeliverableRow } from "./DeliverableRow";

type Props = {
  phase: ScopePhase;
  roles: Role[];
  overheadPerDay: number;
  phaseTotalDays: number;
  phaseTotalInvestment: number;
  calcDeliverableDays: (d: ScopeDeliverable) => number;
  calcDeliverableInvestment: (d: ScopeDeliverable) => number;
  onAllocationChange: (
    phaseId: string,
    deliverableId: string,
    roleId: string,
    days: number
  ) => void;
  onDeliverableRename: (
    phaseId: string,
    deliverableId: string,
    name: string
  ) => void;
  onRemoveDeliverable: (phaseId: string, deliverableId: string) => void;
  onAddDeliverable: () => void;
  onPhaseRename: (phaseId: string, name: string) => void;
};

export function PhaseSection({
  phase,
  roles,
  overheadPerDay,
  phaseTotalDays,
  phaseTotalInvestment,
  calcDeliverableDays,
  calcDeliverableInvestment,
  onAllocationChange,
  onDeliverableRename,
  onRemoveDeliverable,
  onAddDeliverable,
  onPhaseRename,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center justify-between bg-card px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-text-dim hover:text-foreground transition-colors text-xs"
          >
            {collapsed ? "\u25B8" : "\u25BE"}
          </button>
          {editingName ? (
            <Input
              type="text"
              value={phase.name}
              onChange={(e) => onPhaseRename(phase.id, e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="h-7 w-48 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <h2
              className="text-sm font-semibold text-foreground cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => setEditingName(true)}
            >
              {phase.name}
            </h2>
          )}
          <span className="text-xs text-text-dim">
            {phase.deliverables.length} deliverable
            {phase.deliverables.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <span className="text-muted-foreground">
            {phaseTotalDays % 1 === 0
              ? phaseTotalDays
              : phaseTotalDays.toFixed(1)}{" "}
            days
          </span>
          <span className="text-foreground font-medium">
            {formatCurrency(phaseTotalInvestment)}
          </span>
        </div>
      </div>

      {/* Phase content */}
      {!collapsed && (
        <>
          {phase.deliverables.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-dim min-w-[200px]">
                      Deliverable
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.id}
                        className="px-2 py-2 text-center text-xs font-medium text-text-dim min-w-[70px]"
                        title={role.title}
                      >
                        <span className="block truncate max-w-[80px]">
                          {abbreviateRole(role.title)}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-dim w-[70px]">
                      Days
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-dim w-[100px]">
                      Investment
                    </th>
                    <th className="w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {phase.deliverables.map((deliverable) => (
                    <DeliverableRow
                      key={deliverable.id}
                      deliverable={deliverable}
                      phaseId={phase.id}
                      roles={roles}
                      totalDays={calcDeliverableDays(deliverable)}
                      investment={calcDeliverableInvestment(deliverable)}
                      onAllocationChange={onAllocationChange}
                      onRename={onDeliverableRename}
                      onRemove={onRemoveDeliverable}
                    />
                  ))}
                </tbody>
                {/* Phase subtotal */}
                <tfoot>
                  <tr className="border-t border-border bg-card">
                    <td className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      {phase.name} Total
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} />
                    ))}
                    <td className="px-3 py-2 text-right text-xs font-medium text-foreground tabular-nums">
                      {phaseTotalDays % 1 === 0
                        ? phaseTotalDays
                        : phaseTotalDays.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-foreground tabular-nums">
                      {formatCurrencyExact(phaseTotalInvestment)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Add deliverable button */}
          <div className="px-4 py-3">
            <Button variant="ghost" size="xs" onClick={onAddDeliverable}>
              + Add Deliverable
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
