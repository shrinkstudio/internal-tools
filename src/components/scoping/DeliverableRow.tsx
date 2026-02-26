"use client";

import { useState } from "react";
import { formatCurrencyExact } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
    <tr className="border-b border-border last:border-b-0 hover:bg-card/30">
      {/* Deliverable name */}
      <td className="px-4 py-1.5">
        {editingName ? (
          <Input
            type="text"
            value={deliverable.name}
            onChange={(e) =>
              onRename(phaseId, deliverable.id, e.target.value)
            }
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <span
            className="text-sm text-foreground cursor-pointer hover:text-muted-foreground transition-colors"
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
            <Input
              type="number"
              min="0"
              step="0.5"
              value={days || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                onAllocationChange(phaseId, deliverable.id, role.id, val);
              }}
              placeholder=""
              className="h-7 px-1.5 text-xs text-center tabular-nums placeholder:text-transparent"
            />
          </td>
        );
      })}

      {/* Total days */}
      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground tabular-nums">
        {totalDays > 0
          ? totalDays % 1 === 0
            ? totalDays
            : totalDays.toFixed(1)
          : ""}
      </td>

      {/* Investment */}
      <td className="px-3 py-1.5 text-right text-xs text-foreground font-medium tabular-nums">
        {investment > 0 ? formatCurrencyExact(investment) : ""}
      </td>

      {/* Remove */}
      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => onRemove(phaseId, deliverable.id)}
          className="text-text-dim hover:text-red-400 transition-colors text-xs leading-none"
          title="Remove deliverable"
        >
          &times;
        </button>
      </td>
    </tr>
  );
}
