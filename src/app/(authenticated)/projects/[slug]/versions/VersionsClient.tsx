"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  calculateGrossProfit,
  calculateProfitMargin,
  calculateClientDayRate,
  calculateTotalCostPerDay,
} from "@/lib/calculations";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils";
import { Toast } from "@/components/ui/Toast";
import type {
  Project,
  ProjectVersion,
  Role,
  ScopeSnapshot,
  ScopeDeliverable,
} from "@/lib/types";

type Props = {
  project: Project;
  versions: ProjectVersion[];
  roles: Role[];
  overheadPerDay: number;
};

export function VersionsClient({
  project,
  versions: initialVersions,
  roles,
  overheadPerDay,
}: Props) {
  const [versions, setVersions] = useState(initialVersions);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace the oldest selection
        const arr = Array.from(next);
        next.delete(arr[0]);
        next.add(id);
      }
      return next;
    });
    setShowCompare(false);
  }

  async function handleRevert(version: ProjectVersion) {
    const nextNumber =
      Math.max(...versions.map((v) => v.version_number), 0) + 1;

    // Deep copy the snapshot
    const snapshot: ScopeSnapshot = JSON.parse(
      JSON.stringify(version.snapshot)
    );

    const { data: newVersion } = await supabase
      .from("project_versions")
      .insert({
        project_id: project.id,
        version_number: nextNumber,
        name: `Reverted from v${version.version_number}`,
        snapshot,
        total_investment: version.total_investment,
        total_internal_cost: version.total_internal_cost,
      })
      .select()
      .single();

    if (newVersion) {
      await supabase
        .from("projects")
        .update({
          current_version_id: newVersion.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      setVersions((prev) => [newVersion, ...prev]);
      setToast(
        `Reverted to v${version.version_number} — saved as v${nextNumber}`
      );
    }
  }

  function handleShareVersion(version: ProjectVersion) {
    navigator.clipboard.writeText(
      `https://internal.shrink.studio/p/${project.slug}?v=${version.version_number}`
    );
    setToast(`Copied link for v${version.version_number}`);
  }

  const selectedVersions = versions.filter((v) => selected.has(v.id));
  const canCompare = selected.size === 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">{project.client_name}</p>
          <h1 className="text-xl font-semibold text-text">
            Version History — {project.project_name}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canCompare && (
            <button
              onClick={() => setShowCompare(true)}
              className="rounded-md bg-text px-4 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover transition-colors"
            >
              Compare Selected
            </button>
          )}
          <Link
            href={`/projects/${project.slug}`}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface transition-colors"
          >
            Back to Scope
          </Link>
        </div>
      </div>

      {/* Version cards */}
      <div className="space-y-3">
        {versions.map((version) => {
          const investment = Number(version.total_investment ?? 0);
          const internalCost = Number(version.total_internal_cost ?? 0);
          const profit = calculateGrossProfit(investment, internalCost);
          const margin = calculateProfitMargin(profit, investment);
          const isCurrent = version.id === project.current_version_id;
          const isSelected = selected.has(version.id);

          const marginColor =
            margin > 30
              ? "text-green-400"
              : margin >= 15
                ? "text-orange-400"
                : "text-red-400";

          return (
            <div
              key={version.id}
              className={`rounded-lg border p-4 transition-colors ${
                isSelected
                  ? "border-text-muted bg-surface"
                  : "border-border hover:border-border-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(version.id)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                      isSelected
                        ? "border-text bg-text text-bg"
                        : "border-border hover:border-border-hover"
                    }`}
                  >
                    {isSelected && "✓"}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-border px-1.5 py-0.5 text-xs font-mono font-medium text-text">
                        v{version.version_number}
                      </span>
                      <span className="text-sm font-medium text-text">
                        {version.name ?? "Unnamed version"}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-dim">
                      {new Date(version.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <div className="text-right">
                    <p className="text-text-dim">Investment</p>
                    <p className="text-text font-medium">
                      {formatCurrency(investment)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-dim">Cost</p>
                    <p className="text-text-muted">
                      {formatCurrency(internalCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-dim">Margin</p>
                    <p className={`font-medium ${marginColor}`}>
                      {investment > 0 ? `${margin.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-3 pl-7">
                <Link
                  href={`/projects/${project.slug}?v=${version.version_number}`}
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  View
                </Link>
                {!isCurrent && (
                  <button
                    onClick={() => handleRevert(version)}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Revert to this version
                  </button>
                )}
                <button
                  onClick={() => handleShareVersion(version)}
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Share this version
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `/api/projects/${project.slug}/export?type=client&v=${version.version_number}`,
                      "_blank"
                    )
                  }
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Export Client PDF
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `/api/projects/${project.slug}/export?type=internal&v=${version.version_number}`,
                      "_blank"
                    )
                  }
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Export Internal PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {versions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-text-muted">No versions saved yet</p>
          <p className="mt-1 text-xs text-text-dim">
            Use &quot;Save Version&quot; on the scoping page to create a
            snapshot
          </p>
        </div>
      )}

      {/* Compare modal */}
      {showCompare && canCompare && (
        <CompareView
          versionA={selectedVersions[0]}
          versionB={selectedVersions[1]}
          roles={roles}
          overheadPerDay={overheadPerDay}
          onClose={() => setShowCompare(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// --- Compare View ---

type DiffItem = {
  type: "added" | "removed" | "changed" | "unchanged";
  name: string;
  phaseName: string;
  investmentA: number;
  investmentB: number;
  daysA: number;
  daysB: number;
};

function CompareView({
  versionA,
  versionB,
  roles,
  overheadPerDay,
  onClose,
}: {
  versionA: ProjectVersion;
  versionB: ProjectVersion;
  roles: Role[];
  overheadPerDay: number;
  onClose: () => void;
}) {
  // Ensure A is the older version
  const [older, newer] =
    versionA.version_number < versionB.version_number
      ? [versionA, versionB]
      : [versionB, versionA];

  function calcInvestment(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce(
      (sum, [roleId, days]) => {
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
      },
      0
    );
  }

  function calcDays(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce(
      (sum, days) => sum + (days || 0),
      0
    );
  }

  // Build a flat list of deliverables from each version
  type FlatDeliverable = ScopeDeliverable & { phaseName: string };

  function flatten(snapshot: ScopeSnapshot): FlatDeliverable[] {
    return (snapshot?.phases ?? []).flatMap((p) =>
      p.deliverables.map((d) => ({ ...d, phaseName: p.name }))
    );
  }

  const olderItems = flatten(older.snapshot);
  const newerItems = flatten(newer.snapshot);

  // Match by id first, then name
  const olderMap = new Map<string, FlatDeliverable>();
  olderItems.forEach((d) => olderMap.set(d.id, d));
  const newerMap = new Map<string, FlatDeliverable>();
  newerItems.forEach((d) => newerMap.set(d.id, d));

  const diffs: DiffItem[] = [];
  const matchedNewerIds = new Set<string>();

  // Check each older deliverable
  for (const oldD of olderItems) {
    let match = newerMap.get(oldD.id);
    if (!match) {
      // Try matching by name
      match = newerItems.find(
        (n) => n.name === oldD.name && !matchedNewerIds.has(n.id)
      );
    }

    if (match) {
      matchedNewerIds.add(match.id);
      const invA = calcInvestment(oldD);
      const invB = calcInvestment(match);
      const daysA = calcDays(oldD);
      const daysB = calcDays(match);
      const changed = invA !== invB || daysA !== daysB;
      diffs.push({
        type: changed ? "changed" : "unchanged",
        name: match.name,
        phaseName: match.phaseName,
        investmentA: invA,
        investmentB: invB,
        daysA,
        daysB,
      });
    } else {
      diffs.push({
        type: "removed",
        name: oldD.name,
        phaseName: oldD.phaseName,
        investmentA: calcInvestment(oldD),
        investmentB: 0,
        daysA: calcDays(oldD),
        daysB: 0,
      });
    }
  }

  // Added in newer
  for (const newD of newerItems) {
    if (!matchedNewerIds.has(newD.id)) {
      diffs.push({
        type: "added",
        name: newD.name,
        phaseName: newD.phaseName,
        investmentA: 0,
        investmentB: calcInvestment(newD),
        daysA: 0,
        daysB: calcDays(newD),
      });
    }
  }

  const totalOldInv = Number(older.total_investment ?? 0);
  const totalNewInv = Number(newer.total_investment ?? 0);
  const totalOldCost = Number(older.total_internal_cost ?? 0);
  const totalNewCost = Number(newer.total_internal_cost ?? 0);
  const netInvChange = totalNewInv - totalOldInv;
  const netCostChange = totalNewCost - totalOldCost;

  const changedDiffs = diffs.filter((d) => d.type !== "unchanged");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl rounded-lg border border-border bg-bg shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Compare v{older.version_number} → v{newer.version_number}
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              {older.name ?? `v${older.version_number}`} →{" "}
              {newer.name ?? `v${newer.version_number}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Diff table */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {changedDiffs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-text-dim">
                    Deliverable
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-text-dim">
                    Phase
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-dim">
                    v{older.version_number} Days
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-dim">
                    v{newer.version_number} Days
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-dim">
                    v{older.version_number} £
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-dim">
                    v{newer.version_number} £
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-text-dim">
                    Delta
                  </th>
                </tr>
              </thead>
              <tbody>
                {changedDiffs.map((diff, i) => {
                  const delta = diff.investmentB - diff.investmentA;
                  const bgClass =
                    diff.type === "added"
                      ? "bg-green-500/5"
                      : diff.type === "removed"
                        ? "bg-red-500/5"
                        : "bg-orange-500/5";
                  const textClass =
                    diff.type === "added"
                      ? "text-green-400"
                      : diff.type === "removed"
                        ? "text-red-400"
                        : "text-orange-400";

                  return (
                    <tr
                      key={i}
                      className={`border-b border-border ${bgClass}`}
                    >
                      <td className="py-2 pr-3">
                        <span className={`text-sm ${textClass}`}>
                          {diff.type === "added" && "+ "}
                          {diff.type === "removed" && "− "}
                          {diff.name}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-text-dim">
                        {diff.phaseName}
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted tabular-nums">
                        {diff.daysA > 0 ? diff.daysA : "—"}
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted tabular-nums">
                        {diff.daysB > 0 ? diff.daysB : "—"}
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted tabular-nums">
                        {diff.investmentA > 0
                          ? formatCurrencyExact(diff.investmentA)
                          : "—"}
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted tabular-nums">
                        {diff.investmentB > 0
                          ? formatCurrencyExact(diff.investmentB)
                          : "—"}
                      </td>
                      <td
                        className={`py-2 text-right text-xs font-medium tabular-nums ${textClass}`}
                      >
                        {delta > 0 ? "+" : ""}
                        {formatCurrencyExact(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-text-dim text-center py-8">
              No differences found between these versions
            </p>
          )}
        </div>

        {/* Net change summary */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-6 text-xs">
          <div>
            <p className="text-text-dim">Net Investment Change</p>
            <p
              className={`font-medium tabular-nums ${netInvChange > 0 ? "text-green-400" : netInvChange < 0 ? "text-red-400" : "text-text-muted"}`}
            >
              {netInvChange > 0 ? "+" : ""}
              {formatCurrencyExact(netInvChange)}
            </p>
          </div>
          <div>
            <p className="text-text-dim">Net Internal Cost Change</p>
            <p
              className={`font-medium tabular-nums ${netCostChange > 0 ? "text-orange-400" : netCostChange < 0 ? "text-green-400" : "text-text-muted"}`}
            >
              {netCostChange > 0 ? "+" : ""}
              {formatCurrencyExact(netCostChange)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
