"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { DEFAULT_PHASES } from "@/lib/types";
import type { ScopeSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <h1 className="text-xl font-semibold text-foreground">New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new scoping project.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <Label htmlFor="client-name">Client Name</Label>
          <Input
            id="client-name"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            placeholder="e.g. Acme Corp"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            placeholder="e.g. Website Redesign"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="slug">
            Slug
            <span className="ml-1 text-text-dim font-normal">(auto-generated)</span>
          </Label>
          <Input
            id="slug"
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
            className="mt-1 font-mono"
          />
          {finalSlug && (
            <p className="mt-1.5 text-xs text-text-dim">
              Client link:{" "}
              <span className="text-muted-foreground font-mono">
                internal.shrink.studio/p/{finalSlug}
              </span>
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !clientName.trim() || !projectName.trim()}
          >
            {loading ? "Creating..." : "Create Project"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
