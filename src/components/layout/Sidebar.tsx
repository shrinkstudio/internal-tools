"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Projects",
    href: "/projects",
  },
  {
    label: "Settings",
    children: [
      { label: "Overhead", href: "/settings/overhead" },
      { label: "Rate Card", href: "/settings/rate-card" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/projects" className="block">
          <span className="text-sm font-semibold text-text tracking-tight">
            Shrink Studio
          </span>
          <span className="block text-xs text-text-muted mt-0.5">
            Internal Tools
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) =>
          item.href ? (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-border text-text"
                  : "text-text-muted hover:text-text hover:bg-border/50"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <div key={item.label} className="pt-3">
              <span className="block px-3 pb-1 text-xs font-medium uppercase tracking-wider text-text-dim">
                {item.label}
              </span>
              <div className="space-y-0.5">
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                      pathname === child.href
                        ? "bg-border text-text"
                        : "text-text-muted hover:text-text hover:bg-border/50"
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          )
        )}
      </nav>
    </aside>
  );
}
