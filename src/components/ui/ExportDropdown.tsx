"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  slug: string;
  versionNumber?: number;
};

export function ExportDropdown({ slug, versionNumber }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const vParam = versionNumber ? `&v=${versionNumber}` : "";

  function handleExport(type: "client" | "internal") {
    setOpen(false);
    window.open(`/api/projects/${slug}/export?type=${type}${vParam}`, "_blank");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface transition-colors"
      >
        Export PDF
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-bg shadow-lg z-50">
          <button
            onClick={() => handleExport("client")}
            className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors rounded-t-lg"
          >
            <span className="block">Client Proposal PDF</span>
            <span className="block text-xs text-text-dim mt-0.5">
              Branded, client-safe
            </span>
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => handleExport("internal")}
            className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors rounded-b-lg"
          >
            <span className="block">Internal Budget PDF</span>
            <span className="block text-xs text-text-dim mt-0.5">
              Full costs, confidential
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
