import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/types";
import type { Project, ProjectVersion } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, project_versions!project_versions_project_id_fkey(*)")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Projects</h1>
          <p className="mt-1 text-sm text-text-muted">
            All scoping projects. Create a new project to start building a
            proposal.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-text px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover transition-colors"
        >
          New Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-3">
          {projects.map((project: Project & { project_versions: ProjectVersion[] }) => {
            const currentVersion = project.current_version_id
              ? project.project_versions.find(
                  (v) => v.id === project.current_version_id
                )
              : project.project_versions[0];

            const totalInvestment = currentVersion?.total_investment ?? 0;
            const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-border-hover transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">
                      {project.client_name}
                    </p>
                    <p className="text-base font-medium text-text">
                      {project.project_name}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-text-dim">
                  <span className="tabular-nums font-medium text-text-muted">
                    {formatCurrency(Number(totalInvestment))}
                  </span>
                  <span>
                    Updated{" "}
                    {new Date(project.updated_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {currentVersion && (
                    <span>
                      v{currentVersion.version_number}
                      {currentVersion.name ? ` — ${currentVersion.name}` : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-text-muted">No projects yet</p>
          <Link
            href="/projects/new"
            className="mt-2 inline-block text-sm text-text hover:underline"
          >
            Create your first project
          </Link>
        </div>
      )}
    </div>
  );
}
