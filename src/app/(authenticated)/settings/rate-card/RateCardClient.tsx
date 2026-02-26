"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  calculateTotalCostPerDay,
  calculateMarkupAmount,
  calculateClientDayRate,
  calculateClientHourlyRate,
} from "@/lib/calculations";
import { formatCurrencyExact, formatPercent } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = {
  id: string;
  title: string;
  base_cost_day: number;
  markup_pct: number;
  sort_order: number;
  is_active: boolean;
};

export function RateCardClient({
  initialRoles,
  overheadPerDay,
}: {
  initialRoles: Role[];
  overheadPerDay: number;
}) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const supabase = createBrowserClient();

  // --- Auto-save (debounced) ---
  const saveRole = useCallback(
    (role: Role) => {
      if (saveTimers.current[role.id]) {
        clearTimeout(saveTimers.current[role.id]);
      }
      saveTimers.current[role.id] = setTimeout(async () => {
        await supabase
          .from("roles")
          .update({
            title: role.title,
            base_cost_day: role.base_cost_day,
            markup_pct: role.markup_pct,
            is_active: role.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", role.id);
      }, 500);
    },
    [supabase]
  );

  function handleRoleChange(
    id: string,
    field: keyof Role,
    value: string | number | boolean
  ) {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== id) return role;
        const updated = { ...role, [field]: value };
        saveRole(updated);
        return updated;
      })
    );
  }

  async function handleAddRole() {
    const newRole = {
      title: "",
      base_cost_day: 0,
      markup_pct: 0.3,
      sort_order: roles.length,
      is_active: true,
    };

    const { data } = await supabase
      .from("roles")
      .insert(newRole)
      .select()
      .single();

    if (data) {
      setRoles((prev) => [...prev, data]);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("roles").delete().eq("id", deleteTarget.id);
    setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Rate Card</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each role&apos;s cost + overhead + markup = client rate
        </p>
      </div>

      {/* Overhead info bar */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Overhead per day:
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrencyExact(overheadPerDay)}
        </span>
        <span className="text-xs text-text-dim">(from Settings)</span>
      </div>

      {/* Rate card table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Role Title
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Base Cost/Day
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-text-dim">
                Overhead/Day
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-text-dim">
                Total Cost/Day
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Markup %
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-text-dim">
                Markup £
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-text-dim">
                Client Rate/Day
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-text-dim">
                Client Rate/Hour
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-16">
                Active
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const baseCost = Number(role.base_cost_day);
              const markup = Number(role.markup_pct);
              const totalCost = calculateTotalCostPerDay(baseCost, overheadPerDay);
              const markupAmount = calculateMarkupAmount(totalCost, markup);
              const clientDay = calculateClientDayRate(baseCost, overheadPerDay, markup);
              const clientHour = calculateClientHourlyRate(clientDay);

              return (
                <tr
                  key={role.id}
                  className={`border-b border-border last:border-b-0 ${
                    role.is_active ? "" : "opacity-40"
                  }`}
                >
                  {/* Editable: Title */}
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      value={role.title}
                      onChange={(e) =>
                        handleRoleChange(role.id, "title", e.target.value)
                      }
                      className="h-7 text-sm"
                    />
                  </td>

                  {/* Editable: Base Cost */}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-muted-foreground text-xs">£</span>
                      <Input
                        type="number"
                        step="10"
                        value={role.base_cost_day}
                        onChange={(e) =>
                          handleRoleChange(
                            role.id,
                            "base_cost_day",
                            Number(e.target.value)
                          )
                        }
                        className="h-7 w-20 text-sm text-right tabular-nums"
                      />
                    </div>
                  </td>

                  {/* Calculated: Overhead/Day */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-dim">
                    {formatCurrencyExact(overheadPerDay)}
                  </td>

                  {/* Calculated: Total Cost/Day */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-dim">
                    {formatCurrencyExact(totalCost)}
                  </td>

                  {/* Editable: Markup % */}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="5"
                        min="0"
                        max="100"
                        value={Math.round(markup * 100)}
                        onChange={(e) =>
                          handleRoleChange(
                            role.id,
                            "markup_pct",
                            Number(e.target.value) / 100
                          )
                        }
                        className="h-7 w-14 text-sm text-right tabular-nums"
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  </td>

                  {/* Calculated: Markup £ */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-dim">
                    {formatCurrencyExact(markupAmount)}
                  </td>

                  {/* Calculated: Client Day Rate */}
                  <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">
                    {formatCurrencyExact(clientDay)}
                  </td>

                  {/* Calculated: Client Hourly Rate */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-dim">
                    {formatCurrencyExact(clientHour)}
                  </td>

                  {/* Toggle: Active */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() =>
                        handleRoleChange(
                          role.id,
                          "is_active",
                          !role.is_active
                        )
                      }
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        role.is_active ? "bg-green-600" : "bg-border"
                      }`}
                      title={role.is_active ? "Active" : "Inactive"}
                    >
                      <span
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          role.is_active
                            ? "translate-x-4"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Delete */}
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDeleteTarget(role)}
                      className="text-text-dim hover:text-red-400"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      {roles.filter((r) => r.is_active).length > 0 && (
        <div className="text-xs text-text-dim">
          {roles.filter((r) => r.is_active).length} active role
          {roles.filter((r) => r.is_active).length !== 1 ? "s" : ""} ·
          Blended client day rate:{" "}
          <span className="text-muted-foreground tabular-nums">
            {formatCurrencyExact(
              roles
                .filter((r) => r.is_active)
                .reduce(
                  (sum, r) =>
                    sum +
                    calculateClientDayRate(
                      Number(r.base_cost_day),
                      overheadPerDay,
                      Number(r.markup_pct)
                    ),
                  0
                ) / roles.filter((r) => r.is_active).length
            )}
          </span>
        </div>
      )}

      {/* Add role */}
      <Button variant="dashed" onClick={handleAddRole}>
        + Add role
      </Button>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete role"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
