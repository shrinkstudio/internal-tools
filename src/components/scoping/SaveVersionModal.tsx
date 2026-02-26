"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0" showCloseButton={false}>
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle>Save as Version {nextVersionNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          <div>
            <Label htmlFor="version-name" className="text-xs text-muted-foreground">
              Version name
            </Label>
            <Input
              id="version-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Initial proposal"
              required
              className="mt-1"
              autoFocus
            />
          </div>

          <div className="flex gap-4 text-xs">
            <div>
              <p className="text-text-dim">Investment</p>
              <p className="text-foreground font-medium tabular-nums">
                {formatCurrency(totalInvestment)}
              </p>
            </div>
            <div>
              <p className="text-text-dim">Internal Cost</p>
              <p className="text-foreground font-medium tabular-nums">
                {formatCurrency(totalInternalCost)}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              size="xs"
            >
              {saving ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
