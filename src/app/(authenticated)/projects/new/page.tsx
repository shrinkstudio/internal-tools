"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { DEFAULT_PHASES } from "@/lib/types";
import type { ScopeSnapshot } from "@/lib/types";

export default function NewProjectPage() {
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const autoSlug = generateSlug(clientName, projectName);
  const finalSlug = slugOverride || autoSlug;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !projectName.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createBrowserClient();

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        slug: finalSlug,
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        status: "draft",
      })
      .select()
      .single();

    if (projectError) {
      setError(
        projectError.code === "23505"
          ? "A project with this slug already exists. Try a different name or override the slug."
          : projectError.message
      );
      setLoading(false);
      return;
    }

    // Create initial empty version (v1)
    const emptySnapshot: ScopeSnapshot = {
      phases: DEFAULT_PHASES.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      })),
    };

    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .insert({
        project_id: project.id,
        version_number: 1,
        name: "Working draft",
        snapshot: emptySnapshot,
        total_investment: 0,
        total_internal_cost: 0,
      })
      .select()
      .single();

    if (versionError) {
      setError(versionError.message);
      setLoading(false);
      return;
    }

    // Set current_version_id on the project
    await supabase
      .from("projects")
      .update({ current_version_id: version.id })
      .eq("id", project.id);

    router.push(`/projects/${project.slug}`);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">New Project</h1>
        <p className="mt-1 text-sm text-text-muted">
          Create a new scoping project.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            placeholder="e.g. Acme Corp"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            placeholder="e.g. Website Redesign"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Slug
            <span className="ml-1 text-text-dim font-normal">(auto-generated)</span>
          </label>
          <input
            type="text"
            value={slugOverride}
            onChange={(e) =>
              setSlugOverride(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/g, "-")
                  .replace(/^-|-$/g, "")
              )
            }
            placeholder={autoSlug || "client-project-name"}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-dim focus:border-border-hover focus:outline-none font-mono"
          />
          {finalSlug && (
            <p className="mt-1.5 text-xs text-text-dim">
              Client link:{" "}
              <span className="text-text-muted font-mono">
                internal.shrink.studio/p/{finalSlug}
              </span>
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !clientName.trim() || !projectName.trim()}
            className="rounded-md bg-text px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
