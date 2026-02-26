"use client";

import { useState } from "react";
import { formatDayRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceLibraryItem } from "@/lib/types";

type Props = {
  phaseName: string;
  services: ServiceLibraryItem[];
  allServices: ServiceLibraryItem[];
  onSelect: (service: ServiceLibraryItem) => void;
  onCustom: (name: string) => void;
  onClose: () => void;
};

export function ServicePicker({
  phaseName,
  services,
  allServices,
  onSelect,
  onCustom,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [showAllPhases, setShowAllPhases] = useState(false);

  const displayServices = showAllPhases ? allServices : services;
  const filtered = search
    ? displayServices.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : displayServices;

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customName.trim()) {
      onCustom(customName.trim());
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[80vh] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle>Add Deliverable - {phaseName}</DialogTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="mt-3"
            autoFocus
          />
        </DialogHeader>

        {/* Service list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length > 0 ? (
            <div className="space-y-0.5">
              {filtered.map((service) => (
                <button
                  key={service.id}
                  onClick={() => onSelect(service)}
                  className="w-full text-left rounded-md px-3 py-2.5 hover:bg-card transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-foreground">{service.name}</p>
                      {service.typical_team && (
                        <p className="text-xs text-text-dim mt-0.5">
                          {service.typical_team.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatDayRange(
                        service.typical_effort_min,
                        service.typical_effort_max
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-text-dim text-center">
              No services found
            </p>
          )}

          {!showAllPhases && allServices.length > services.length && (
            <button
              onClick={() => setShowAllPhases(true)}
              className="w-full text-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              Show services from all phases
            </button>
          )}
        </div>

        {/* Custom deliverable */}
        <div className="px-5 py-3 border-t border-border">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Or type a custom deliverable name..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!customName.trim()}
              size="xs"
            >
              Add
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
