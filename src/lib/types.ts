/** Scoping snapshot stored as JSONB in project_versions */
export type ScopeSnapshot = {
  phases: ScopePhase[];
};

export type ScopePhase = {
  id: string;
  name: string;
  sort_order: number;
  deliverables: ScopeDeliverable[];
};

export type ScopeDeliverable = {
  id: string;
  name: string;
  service_id: string | null;
  role_allocations: Record<string, number>; // roleId → days
  internal_notes: string;
};

/** Database row types */
export type Project = {
  id: string;
  slug: string;
  client_name: string;
  project_name: string;
  status: "draft" | "sent" | "approved" | "complete";
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectVersion = {
  id: string;
  project_id: string;
  version_number: number;
  name: string | null;
  snapshot: ScopeSnapshot;
  total_investment: number | null;
  total_internal_cost: number | null;
  created_at: string;
};

export type Role = {
  id: string;
  title: string;
  base_cost_day: number;
  markup_pct: number;
  sort_order: number;
  is_active: boolean;
};

export type ServiceLibraryItem = {
  id: string;
  name: string;
  phase: string;
  description: string | null;
  typical_effort_min: number | null;
  typical_effort_max: number | null;
  typical_team: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export type OverheadItem = {
  id: string;
  name: string;
  category: string;
  monthly_cost: number;
  notes: string | null;
  sort_order: number;
};

/** Status display config */
export const STATUS_CONFIG: Record<
  Project["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-[#2a2a2a] text-[#888888]",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-500/15 text-blue-400",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/15 text-green-400",
  },
  complete: {
    label: "Complete",
    className: "bg-purple-500/15 text-purple-400",
  },
};

/** Default phases for a new project */
export const DEFAULT_PHASES: ScopePhase[] = [
  { id: crypto.randomUUID(), name: "Discovery", sort_order: 0, deliverables: [] },
  { id: crypto.randomUUID(), name: "Development", sort_order: 1, deliverables: [] },
  { id: crypto.randomUUID(), name: "Launch", sort_order: 2, deliverables: [] },
  { id: crypto.randomUUID(), name: "Ongoing", sort_order: 3, deliverables: [] },
];
