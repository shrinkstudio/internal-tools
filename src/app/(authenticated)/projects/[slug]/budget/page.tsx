import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { BudgetClient } from "./BudgetClient";
import type { Project, ProjectVersion, Role } from "@/lib/types";

export default async function BudgetPage({
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
      .select("*, project_versions(*)")
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

  const versions: ProjectVersion[] = project.project_versions ?? [];
  const currentVersion = project.current_version_id
    ? versions.find((v: ProjectVersion) => v.id === project.current_version_id)
    : versions[0];

  return (
    <BudgetClient
      project={project as Project}
      currentVersion={currentVersion ?? null}
      roles={(roles ?? []) as Role[]}
      overheadPerDay={overheadPerDay}
    />
  );
}
