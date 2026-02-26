import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { VersionsClient } from "./VersionsClient";
import type { Project, ProjectVersion, Role } from "@/lib/types";

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const [
    { data: project },
    { data: roles },
    { data: overheadItems },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, project_versions!project_versions_project_id_fkey(*)")
      .eq("slug", slug)
      .single(),
    supabase
      .from("roles")
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

  const versions: ProjectVersion[] = (project.project_versions ?? []).sort(
    (a: ProjectVersion, b: ProjectVersion) => b.version_number - a.version_number
  );

  return (
    <VersionsClient
      project={project as Project}
      versions={versions}
      roles={(roles ?? []) as Role[]}
      overheadPerDay={overheadPerDay}
    />
  );
}
