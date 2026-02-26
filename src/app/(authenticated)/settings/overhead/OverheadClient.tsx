"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { formatCurrencyExact } from "@/lib/utils";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type OverheadItem = {
  id: string;
  name: string;
  category: string;
  monthly_cost: number;
  notes: string | null;
  sort_order: number;
};

const CATEGORIES = [
  "subscription",
  "salary",
  "contractor",
  "workspace",
  "insurance",
  "travel",
  "equipment",
  "marketing",
  "professional",
  "training",
  "hosting",
  "telephone",
  "other",
] as const;

export function OverheadClient({
  initialItems,
  initialBillableDays,
}: {
  initialItems: OverheadItem[];
  initialBillableDays: number;
}) {
  const [items, setItems] = useState<OverheadItem[]>(initialItems);
  const [billableDays, setBillableDays] = useState(initialBillableDays);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OverheadItem | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const billableDaysTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
      if (billableDaysTimer.current) clearTimeout(billableDaysTimer.current);
    };
  }, []);

  const supabase = createBrowserClient();

  // --- Calculations ---
  const totalMonthly = items.reduce((sum, i) => sum + Number(i.monthly_cost), 0);
  const totalAnnual = totalMonthly * 12;
  const overheadPerDay = calculateOverheadPerDay(totalMonthly, billableDays);

  // --- Auto-save item (debounced) ---
  const saveItem = useCallback(
    (item: OverheadItem) => {
      if (saveTimers.current[item.id]) {
        clearTimeout(saveTimers.current[item.id]);
      }
      saveTimers.current[item.id] = setTimeout(async () => {
        await supabase
          .from("overhead_items")
          .update({
            name: item.name,
            category: item.category,
            monthly_cost: item.monthly_cost,
            notes: item.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }, 500);
    },
    [supabase]
  );

  // --- Auto-save billable days (debounced) ---
  const saveBillableDays = useCallback(
    (value: number) => {
      if (billableDaysTimer.current) clearTimeout(billableDaysTimer.current);
      billableDaysTimer.current = setTimeout(async () => {
        await supabase
          .from("settings")
          .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
          .eq("key", "annual_billable_days");
      }, 500);
    },
    [supabase]
  );

  // --- Handlers ---
  function handleItemChange(
    id: string,
    field: keyof OverheadItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        saveItem(updated);
        return updated;
      })
    );
  }

  function handleBillableDaysChange(value: number) {
    const clamped = Math.max(1, Math.min(365, value));
    setBillableDays(clamped);
    saveBillableDays(clamped);
  }

  async function handleAddItem() {
    const newItem = {
      name: "",
      category: "subscription",
      monthly_cost: 0,
      notes: null,
      sort_order: items.length,
    };

    const { data } = await supabase
      .from("overhead_items")
      .insert(newItem)
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data]);
      setEditingId(data.id);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("overhead_items").delete().eq("id", deleteTarget.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Business Overhead</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your running costs - gets added on top of every freelancer&apos;s rate
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard
          label="Total Monthly Overhead"
          value={formatCurrencyExact(totalMonthly)}
        />
        <SummaryCard
          label="Total Annual Overhead"
          value={formatCurrencyExact(totalAnnual)}
        />
        <SummaryCard
          label="Overhead Per Billable Day"
          value={formatCurrencyExact(overheadPerDay)}
        />
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Annual Billable Days</p>
          <Input
            type="number"
            value={billableDays}
            onChange={(e) =>
              handleBillableDaysChange(Number(e.target.value))
            }
            className="mt-1 w-20 h-auto text-lg font-semibold tabular-nums"
          />
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Monthly Cost
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Notes
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-card/50 cursor-pointer"
                  onClick={() => setEditingId(item.id)}
                >
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(item.id, "name", e.target.value)
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingId(null)
                        }
                        className="h-7 text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-foreground">
                        {item.name || "Untitled"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "category",
                            e.target.value
                          )
                        }
                        className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:border-input focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {item.category}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-muted-foreground">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.monthly_cost}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "monthly_cost",
                              Number(e.target.value)
                            )
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && setEditingId(null)
                          }
                          className="h-7 w-24 text-sm text-right tabular-nums"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <span className="text-foreground">
                        {formatCurrencyExact(Number(item.monthly_cost))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <Input
                        type="text"
                        value={item.notes ?? ""}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "notes",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingId(null)
                        }
                        className="h-7 text-sm"
                        placeholder="Optional note"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {item.notes || "\u2014"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(item);
                      }}
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

      {/* Add item */}
      <Button variant="dashed" onClick={handleAddItem}>
        + Add item
      </Button>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete overhead item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
