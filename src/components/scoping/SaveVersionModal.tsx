"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  nextVersionNumber: number;
  totalInvestment: number;
  totalInternalCost: number;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
};

export function SaveVersionModal({
  nextVersionNumber,
  totalInvestment,
  totalInternalCost,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg shadow-2xl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text">
            Save as Version {nextVersionNumber}
          </h3>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Version name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Initial proposal"
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-4 text-xs">
            <div>
              <p className="text-text-dim">Investment</p>
              <p className="text-text font-medium tabular-nums">
                {formatCurrency(totalInvestment)}
              </p>
            </div>
            <div>
              <p className="text-text-dim">Internal Cost</p>
              <p className="text-text font-medium tabular-nums">
                {formatCurrency(totalInternalCost)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-md bg-text px-4 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Version"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
