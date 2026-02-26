"use client";

import { useState } from "react";
import { formatCurrencyExact } from "@/lib/utils";
import type { ScopeDeliverable, Role } from "@/lib/types";

type Props = {
  deliverable: ScopeDeliverable;
  phaseId: string;
  roles: Role[];
  totalDays: number;
  investment: number;
  onAllocationChange: (
    phaseId: string,
    deliverableId: string,
    roleId: string,
    days: number
  ) => void;
  onRename: (phaseId: string, deliverableId: string, name: string) => void;
  onRemove: (phaseId: string, deliverableId: string) => void;
};

export function DeliverableRow({
  deliverable,
  phaseId,
  roles,
  totalDays,
  investment,
  onAllocationChange,
  onRename,
  onRemove,
}: Props) {
  const [editingName, setEditingName] = useState(false);

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-surface/30">
      {/* Deliverable name */}
      <td className="px-4 py-1.5">
        {editingName ? (
          <input
            type="text"
            value={deliverable.name}
            onChange={(e) =>
              onRename(phaseId, deliverable.id, e.target.value)
            }
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="w-full bg-bg border border-border rounded px-2 py-1 text-sm text-text focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            className="text-sm text-text cursor-pointer hover:text-text-muted transition-colors"
            onClick={() => setEditingName(true)}
          >
            {deliverable.name}
          </span>
        )}
      </td>

      {/* Day inputs per role */}
      {roles.map((role) => {
        const days = deliverable.role_allocations[role.id] || 0;
        return (
          <td key={role.id} className="px-1 py-1.5">
            <input
              type="number"
              min="0"
              step="0.5"
              value={days || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                onAllocationChange(phaseId, deliverable.id, role.id, val);
              }}
              placeholder=""
              className="w-full bg-bg border border-border rounded px-1.5 py-1 text-xs text-center text-text tabular-nums focus:border-border-hover focus:outline-none placeholder:text-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </td>
        );
      })}

      {/* Total days */}
      <td className="px-3 py-1.5 text-right text-xs text-text-muted tabular-nums">
        {totalDays > 0
          ? totalDays % 1 === 0
            ? totalDays
            : totalDays.toFixed(1)
          : ""}
      </td>

      {/* Investment */}
      <td className="px-3 py-1.5 text-right text-xs text-text font-medium tabular-nums">
        {investment > 0 ? formatCurrencyExact(investment) : ""}
      </td>

      {/* Remove */}
      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => onRemove(phaseId, deliverable.id)}
          className="text-text-dim hover:text-red-400 transition-colors text-xs leading-none"
          title="Remove deliverable"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
