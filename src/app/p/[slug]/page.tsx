import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOverheadPerDay, calculateClientDayRate } from "@/lib/calculations";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils";
import type { Metadata } from "next";
import type {
  Project,
  ProjectVersion,
  Role,
  ScopePhase,
  ScopeDeliverable,
} from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("client_name, project_name")
    .eq("slug", slug)
    .single();

  if (!project) {
    return { title: "Proposal Not Found" };
  }

  const title = `Project Proposal — ${project.client_name} / ${project.project_name}`;

  return {
    title,
    description: `Project proposal for ${project.client_name} prepared by Shrink Studio.`,
    openGraph: {
      title,
      description: `Project proposal for ${project.client_name} prepared by Shrink Studio.`,
      type: "website",
    },
  };
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { v: versionParam } = await searchParams;
  const supabase = await createServerClient();

  // Fetch project, versions, roles, overhead data in parallel
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
      .select("id, base_cost_day, markup_pct")
      .eq("is_active", true),
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

  if (!version) return notFound();

  const phases: ScopePhase[] = version.snapshot?.phases ?? [];
  const activeRoles = (roles ?? []) as Pick<Role, "id" | "base_cost_day" | "markup_pct">[];

  // Calculate display values
  function calcDeliverableDays(d: ScopeDeliverable): number {
    return Object.values(d.role_allocations).reduce(
      (sum, days) => sum + (days || 0),
      0
    );
  }

  function calcDeliverableInvestment(d: ScopeDeliverable): number {
    return Object.entries(d.role_allocations).reduce((sum, [roleId, days]) => {
      const role = activeRoles.find((r) => r.id === roleId);
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

  function calcPhaseTotals(phase: ScopePhase) {
    let days = 0;
    let investment = 0;
    for (const d of phase.deliverables) {
      days += calcDeliverableDays(d);
      investment += calcDeliverableInvestment(d);
    }
    return { days, investment };
  }

  let grandTotalDays = 0;
  let grandTotalInvestment = 0;
  for (const phase of phases) {
    const t = calcPhaseTotals(phase);
    grandTotalDays += t.days;
    grandTotalInvestment += t.investment;
  }

  const nonEmptyPhases = phases.filter((p) => p.deliverables.length > 0);
  const dateStr = new Date(version.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#EDEDED]">
      <div className="mx-auto max-w-[800px] px-6 py-12 sm:py-16">
        {/* Logo */}
        <div className="mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.prod.website-files.com/65e057e240c278e46ae9af1b/65e5c78224df93f488076413_Shrink%20Studio.svg"
            alt="Shrink Studio"
            width={120}
            height={28}
            className="invert"
          />
        </div>

        {/* Header */}
        <header className="mb-12">
          <p className="text-xs uppercase tracking-widest text-[#555555] mb-3">
            Project Proposal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#EDEDED] sm:text-4xl">
            {(project as Project).project_name}
          </h1>
          <p className="mt-2 text-lg text-[#888888]">
            {(project as Project).client_name}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-[#555555]">
            <span>{dateStr}</span>
            {version.name && (
              <>
                <span className="text-[#1e1e1e]">·</span>
                <span>{version.name}</span>
              </>
            )}
          </div>
        </header>

        {/* Divider */}
        <div className="h-px bg-[#1e1e1e] mb-12" />

        {/* Scope of Work */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-[#555555] mb-8">
            Scope of Work
          </h2>

          <div className="space-y-10">
            {nonEmptyPhases.map((phase) => {
              const totals = calcPhaseTotals(phase);
              return (
                <div key={phase.id}>
                  <h3 className="text-lg font-semibold text-[#EDEDED] mb-4">
                    {phase.name}
                  </h3>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        <th className="pb-2 text-left text-xs font-medium text-[#555555]">
                          Deliverable
                        </th>
                        <th className="pb-2 text-right text-xs font-medium text-[#555555] w-[80px]">
                          Days
                        </th>
                        <th className="pb-2 text-right text-xs font-medium text-[#555555] w-[120px]">
                          Investment
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.deliverables.map((d) => {
                        const days = calcDeliverableDays(d);
                        const inv = calcDeliverableInvestment(d);
                        return (
                          <tr
                            key={d.id}
                            className="border-b border-[#141414]"
                          >
                            <td className="py-3 text-sm text-[#EDEDED]">
                              {d.name}
                            </td>
                            <td className="py-3 text-right text-sm text-[#888888] tabular-nums">
                              {days > 0
                                ? days % 1 === 0
                                  ? days
                                  : days.toFixed(1)
                                : "—"}
                            </td>
                            <td className="py-3 text-right text-sm text-[#EDEDED] tabular-nums">
                              {inv > 0 ? formatCurrencyExact(inv) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#1e1e1e]">
                        <td className="pt-3 text-sm font-medium text-[#888888]">
                          {phase.name} Subtotal
                        </td>
                        <td className="pt-3 text-right text-sm font-medium text-[#888888] tabular-nums">
                          {totals.days > 0
                            ? totals.days % 1 === 0
                              ? totals.days
                              : totals.days.toFixed(1)
                            : "—"}
                        </td>
                        <td className="pt-3 text-right text-sm font-medium text-[#EDEDED] tabular-nums">
                          {formatCurrencyExact(totals.investment)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-[#1e1e1e] mb-12" />

        {/* Investment Summary */}
        <section className="mb-16">
          <h2 className="text-xs uppercase tracking-widest text-[#555555] mb-6">
            Investment Summary
          </h2>

          <div className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[#888888]">Total Investment</p>
                <p className="mt-1 text-3xl font-semibold text-[#EDEDED] tabular-nums sm:text-4xl">
                  {formatCurrency(grandTotalInvestment)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#888888]">Total Days</p>
                <p className="mt-1 text-xl font-semibold text-[#888888] tabular-nums">
                  {grandTotalDays % 1 === 0
                    ? grandTotalDays
                    : grandTotalDays.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#555555]">
            All prices are in GBP and exclude VAT. This proposal is valid for 30 days from the date above.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1e1e1e] pt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#555555]">
                Prepared by Shrink Studio
              </p>
              <p className="text-xs text-[#555555] mt-0.5">
                shrink.studio
              </p>
            </div>
            <p className="text-xs text-[#555555]">{dateStr}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
