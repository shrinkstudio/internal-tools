import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { ScopingClient } from "./ScopingClient";
import type { Project, ProjectVersion, Role, ServiceLibraryItem } from "@/lib/types";

export default async function ProjectScopingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Fetch all data in parallel
  const [
    { data: project },
    { data: roles },
    { data: services },
    { data: overheadItems },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, project_versions(*)")
      .eq("slug", slug)
      .single(),
    supabase
      .from("roles")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("service_library")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("overhead_items").select("monthly_cost"),
    supabase.from("settings").select("*").eq("key", "annual_billable_days"),
  ]);

  if (!project) return notFound();

  const annualBillableDays = settings?.[0]?.value
    ? Number(settings[0].value)
    : 220;
  const totalMonthlyOverhead = (overheadItems ?? []).reduce(
    (sum, i) => sum + Number(i.monthly_cost),
    0
  );
  const overheadPerDay = calculateOverheadPerDay(
    totalMonthlyOverhead,
    annualBillableDays
  );

  // Find current version
  const versions: ProjectVersion[] = project.project_versions ?? [];
  const currentVersion = project.current_version_id
    ? versions.find((v: ProjectVersion) => v.id === project.current_version_id)
    : versions[0];

  return (
    <ScopingClient
      project={project as Project}
      currentVersion={currentVersion ?? null}
      versions={versions}
      roles={(roles ?? []) as Role[]}
      services={(services ?? []) as ServiceLibraryItem[]}
      overheadPerDay={overheadPerDay}
    />
  );
}
