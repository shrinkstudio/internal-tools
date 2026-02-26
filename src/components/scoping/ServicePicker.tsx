"use client";

import { useState } from "react";
import { formatDayRange } from "@/lib/utils";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Add Deliverable — {phaseName}
            </h3>
            <button
              onClick={onClose}
              className="text-text-dim hover:text-text transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none"
            autoFocus
          />
        </div>

        {/* Service list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length > 0 ? (
            <div className="space-y-0.5">
              {filtered.map((service) => (
                <button
                  key={service.id}
                  onClick={() => onSelect(service)}
                  className="w-full text-left rounded-md px-3 py-2.5 hover:bg-surface transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-text">{service.name}</p>
                      {service.typical_team && (
                        <p className="text-xs text-text-dim mt-0.5">
                          {service.typical_team.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap tabular-nums">
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
              className="w-full text-center px-3 py-2 text-xs text-text-muted hover:text-text transition-colors mt-1"
            >
              Show services from all phases
            </button>
          )}
        </div>

        {/* Custom deliverable */}
        <div className="px-5 py-3 border-t border-border">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Or type a custom deliverable name..."
              className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="rounded-md bg-text px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
