"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  slug: string;
  versionNumber?: number;
};

export function ExportDropdown({ slug, versionNumber }: Props) {
  const vParam = versionNumber ? `&v=${versionNumber}` : "";

  function handleExport(type: "client" | "internal") {
    window.open(`/api/projects/${slug}/export?type=${type}${vParam}`, "_blank");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="xs">
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => handleExport("client")}>
          <div>
            <span className="block text-sm">Client Proposal PDF</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Branded, client-safe
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("internal")}>
          <div>
            <span className="block text-sm">Internal Budget PDF</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Full costs, confidential
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
