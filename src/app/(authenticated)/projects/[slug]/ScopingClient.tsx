"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { calculateClientDayRate, calculateTotalCostPerDay } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import { STATUS_CONFIG, DEFAULT_PHASES } from "@/lib/types";
import type {
  Project,
  ProjectVersion,
  Role,
  ServiceLibraryItem,
  ScopeSnapshot,
  ScopePhase,
  ScopeDeliverable,
} from "@/lib/types";
import { PhaseSection } from "@/components/scoping/PhaseSection";
import { ServicePicker } from "@/components/scoping/ServicePicker";
import { SaveVersionModal } from "@/components/scoping/SaveVersionModal";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { Toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  project: Project;
  currentVersion: ProjectVersion | null;
  versions: ProjectVersion[];
  roles: Role[];
  services: ServiceLibraryItem[];
  overheadPerDay: number;
};

export function ScopingClient({
  project: initialProject,
  currentVersion,
  versions: initialVersions,
  roles,
  services,
  overheadPerDay,
}: Props) {
  const [project, setProject] = useState(initialProject);
  const [phases, setPhases] = useState<ScopePhase[]>(
    currentVersion?.snapshot?.phases ?? DEFAULT_PHASES
  );
  const [versions, setVersions] = useState(initialVersions);
  const [versionName, setVersionName] = useState(
    currentVersion?.name ?? "Working draft"
  );
  const [pickerPhaseId, setPickerPhaseId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createBrowserClient();

  // --- Calculations ---
  function calcDeliverableInvestment(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((sum, [roleId, days]) => {
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
    }, 0);
  }

  function calcDeliverableInternalCost(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((sum, [roleId, days]) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || !days) return sum;
      return sum + days * calculateTotalCostPerDay(Number(role.base_cost_day), overheadPerDay);
    }, 0);
  }

  function calcDeliverableDays(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce(
      (sum, days) => sum + (days || 0),
      0
    );
  }

  function calcPhaseTotals(phase: ScopePhase) {
    let days = 0;
    let investment = 0;
    for (const d of phase.deliverables) {
      days += calcDeliverableDays(d);
      investment += calcDeliverableInvestment(d);
    }
    return { days, investment };
  }

  function calcGrandTotals() {
    let days = 0;
    let investment = 0;
    let internalCost = 0;
    for (const phase of phases) {
      for (const d of phase.deliverables) {
        days += calcDeliverableDays(d);
        investment += calcDeliverableInvestment(d);
        internalCost += calcDeliverableInternalCost(d);
      }
    }
    return { days, investment, internalCost };
  }

  const { days: grandTotalDays, investment: grandTotalInvestment, internalCost: grandTotalInternalCost } = calcGrandTotals();

  // --- Auto-save (debounced 1s) ---
  const autoSave = useCallback(
    (updatedPhases: ScopePhase[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!currentVersion) return;

        let totalInv = 0;
        let totalCost = 0;
        for (const phase of updatedPhases) {
          for (const d of phase.deliverables) {
            totalInv += Object.entries(d.role_allocations).reduce(
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
            totalCost += Object.entries(d.role_allocations).reduce(
              (sum, [roleId, days]) => {
                const role = roles.find((r) => r.id === roleId);
                if (!role || !days) return sum;
                return sum + days * calculateTotalCostPerDay(Number(role.base_cost_day), overheadPerDay);
              },
              0
            );
          }
        }

        const snapshot: ScopeSnapshot = { phases: updatedPhases };
        await supabase
          .from("project_versions")
          .update({
            snapshot,
            total_investment: totalInv,
            total_internal_cost: totalCost,
          })
          .eq("id", currentVersion.id);

        await supabase
          .from("projects")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", project.id);
      }, 1000);
    },
    [currentVersion, roles, overheadPerDay, supabase, project.id]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // --- Phase mutations ---
  function updatePhases(updater: (prev: ScopePhase[]) => ScopePhase[]) {
    setPhases((prev) => {
      const next = updater(prev);
      autoSave(next);
      return next;
    });
  }

  function handleAllocationChange(
    phaseId: string,
    deliverableId: string,
    roleId: string,
    days: number
  ) {
    updatePhases((prev) =>
      prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              deliverables: p.deliverables.map((d) =>
                d.id !== deliverableId
                  ? d
                  : {
                      ...d,
                      role_allocations: {
                        ...d.role_allocations,
                        [roleId]: days,
                      },
                    }
              ),
            }
      )
    );
  }

  function handleDeliverableRename(
    phaseId: string,
    deliverableId: string,
    name: string
  ) {
    updatePhases((prev) =>
      prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              deliverables: p.deliverables.map((d) =>
                d.id !== deliverableId ? d : { ...d, name }
              ),
            }
      )
    );
  }

  function handleRemoveDeliverable(phaseId: string, deliverableId: string) {
    updatePhases((prev) =>
      prev.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              deliverables: p.deliverables.filter(
                (d) => d.id !== deliverableId
              ),
            }
      )
    );
  }

  function handleAddDeliverable(
    phaseId: string,
    service: ServiceLibraryItem | null,
    customName?: string
  ) {
    const newDeliverable: ScopeDeliverable = {
      id: crypto.randomUUID(),
      name: service?.name ?? customName ?? "New Deliverable",
      service_id: service?.id ?? null,
      role_allocations: {},
      internal_notes: "",
    };

    updatePhases((prev) =>
      prev.map((p) =>
        p.id !== phaseId
          ? p
          : { ...p, deliverables: [...p.deliverables, newDeliverable] }
      )
    );
    setPickerPhaseId(null);
  }

  function handleAddPhase() {
    const newPhase: ScopePhase = {
      id: crypto.randomUUID(),
      name: "New Phase",
      sort_order: phases.length,
      deliverables: [],
    };
    updatePhases((prev) => [...prev, newPhase]);
  }

  function handlePhaseRename(phaseId: string, name: string) {
    updatePhases((prev) =>
      prev.map((p) => (p.id !== phaseId ? p : { ...p, name }))
    );
  }

  // --- Status change ---
  async function handleStatusChange(status: Project["status"]) {
    setProject((prev) => ({ ...prev, status }));
    await supabase
      .from("projects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", project.id);
  }

  // --- Save version (via modal) ---
  async function handleSaveVersion(name: string) {
    const nextNumber =
      Math.max(...versions.map((v) => v.version_number), 0) + 1;

    const snapshot: ScopeSnapshot = { phases };

    const { data: newVersion } = await supabase
      .from("project_versions")
      .insert({
        project_id: project.id,
        version_number: nextNumber,
        name,
        snapshot,
        total_investment: grandTotalInvestment,
        total_internal_cost: grandTotalInternalCost,
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

      setVersions((prev) => [...prev, newVersion]);
      setVersionName(`v${nextNumber} - ${name}`);
      setShowSaveModal(false);
      setToast(`Saved as v${nextNumber} - ${name}`);
    }
  }

  // --- Copy share link ---
  function handleCopyLink() {
    navigator.clipboard.writeText(
      `https://internal.shrink.studio/p/${project.slug}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusConfig = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{project.client_name}</p>
          <h1 className="text-xl font-semibold text-foreground">
            {project.project_name}
          </h1>
          <p className="mt-1 text-xs text-text-dim">
            {versionName} · Created{" "}
            {new Date(project.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status dropdown */}
          <select
            value={project.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as Project["status"])
            }
            className={`rounded-full px-3 py-1 text-xs font-medium border-0 focus:outline-none cursor-pointer ${statusConfig.className}`}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="complete">Complete</option>
          </select>

          <Button variant="outline" size="xs" onClick={() => setShowSaveModal(true)}>
            Save Version
          </Button>

          <ExportDropdown slug={project.slug} />

          <Button variant="outline" size="xs" onClick={handleCopyLink}>
            {copied ? "Copied!" : "Share Link"}
          </Button>

          <Button variant="outline" size="xs" asChild>
            <Link href={`/projects/${project.slug}/budget`}>Budget</Link>
          </Button>

          <Button variant="outline" size="xs" asChild>
            <Link href={`/projects/${project.slug}/versions`}>Versions</Link>
          </Button>
        </div>
      </div>

      {/* Grand totals bar */}
      <Card className="flex items-center gap-6 px-5 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Investment</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {formatCurrency(grandTotalInvestment)}
          </p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-muted-foreground">Total Days</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {grandTotalDays % 1 === 0
              ? grandTotalDays
              : grandTotalDays.toFixed(1)}
          </p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-muted-foreground">Phases</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {phases.length}
          </p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-muted-foreground">Deliverables</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {phases.reduce((sum, p) => sum + p.deliverables.length, 0)}
          </p>
        </div>
      </Card>

      {/* Phase sections */}
      {phases.map((phase) => {
        const phaseTotals = calcPhaseTotals(phase);

        return (
          <PhaseSection
            key={phase.id}
            phase={phase}
            roles={roles}
            overheadPerDay={overheadPerDay}
            phaseTotalDays={phaseTotals.days}
            phaseTotalInvestment={phaseTotals.investment}
            calcDeliverableDays={calcDeliverableDays}
            calcDeliverableInvestment={calcDeliverableInvestment}
            onAllocationChange={handleAllocationChange}
            onDeliverableRename={handleDeliverableRename}
            onRemoveDeliverable={handleRemoveDeliverable}
            onAddDeliverable={() => setPickerPhaseId(phase.id)}
            onPhaseRename={handlePhaseRename}
          />
        );
      })}

      {/* Add phase */}
      <Button variant="dashed" onClick={handleAddPhase}>
        + Add Phase
      </Button>

      {/* Service picker modal */}
      {pickerPhaseId && (
        <ServicePicker
          phaseName={
            phases.find((p) => p.id === pickerPhaseId)?.name ?? ""
          }
          services={services.filter(
            (s) =>
              s.phase ===
              (
                phases.find((p) => p.id === pickerPhaseId)?.name ?? ""
              ).toLowerCase()
          )}
          allServices={services}
          onSelect={(service) =>
            handleAddDeliverable(pickerPhaseId, service)
          }
          onCustom={(name) =>
            handleAddDeliverable(pickerPhaseId, null, name)
          }
          onClose={() => setPickerPhaseId(null)}
        />
      )}

      {/* Save version modal */}
      {showSaveModal && (
        <SaveVersionModal
          nextVersionNumber={
            Math.max(...versions.map((v) => v.version_number), 0) + 1
          }
          totalInvestment={grandTotalInvestment}
          totalInternalCost={grandTotalInternalCost}
          onSave={handleSaveVersion}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
