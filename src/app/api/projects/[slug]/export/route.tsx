import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay } from "@/lib/calculations";
import { ClientProposalPDF } from "@/components/pdf/ClientProposalPDF";
import { InternalBudgetPDF } from "@/components/pdf/InternalBudgetPDF";
import type { ProjectVersion, Role, ScopePhase } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "client";
  const versionParam = searchParams.get("v");

  const supabase = await createServerClient();

  // Fetch all data in parallel
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
    supabase.from("roles").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("overhead_items").select("monthly_cost"),
    supabase.from("settings").select("*").eq("key", "annual_billable_days"),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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

  // Resolve version
  const versions: ProjectVersion[] = project.project_versions ?? [];
  let version: ProjectVersion | undefined;

  if (versionParam) {
    version = versions.find(
      (v: ProjectVersion) => v.version_number === Number(versionParam)
    );
  } else {
    version = project.current_version_id
      ? versions.find(
          (v: ProjectVersion) => v.id === project.current_version_id
        )
      : versions[0];
  }

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const phases: ScopePhase[] = version.snapshot?.phases ?? [];
  const activeRoles = (roles ?? []) as Role[];
  const date = new Date(version.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate PDF
  let pdfBuffer: Buffer;
  let filename: string;

  const slugBase = `${project.client_name}-${project.project_name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (type === "internal") {
    pdfBuffer = await renderToBuffer(
      <InternalBudgetPDF
        clientName={project.client_name}
        projectName={project.project_name}
        date={date}
        versionName={version.name}
        phases={phases}
        roles={activeRoles}
        overheadPerDay={overheadPerDay}
      />
    );
    filename = `${slugBase}-internal-budget.pdf`;
  } else {
    pdfBuffer = await renderToBuffer(
      <ClientProposalPDF
        clientName={project.client_name}
        projectName={project.project_name}
        date={date}
        versionName={version.name}
        phases={phases}
        roles={activeRoles.map((r) => ({
          id: r.id,
          base_cost_day: r.base_cost_day,
          markup_pct: r.markup_pct,
        }))}
        overheadPerDay={overheadPerDay}
      />
    );
    filename = `${slugBase}-proposal.pdf`;
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
