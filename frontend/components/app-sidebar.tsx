"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  icon: string;
};

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/farms", label: "Farms", icon: "⌘" },
  { href: "/fields", label: "Fields", icon: "▦" },
  { href: "/crops", label: "Crops", icon: "✿" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/workers", label: "Workers", icon: "♙" },
  { href: "/inventory", label: "Inventory", icon: "▣" },
  { href: "/equipment", label: "Equipment", icon: "⚙" },
  { href: "/maintenance", label: "Maintenance", icon: "⌕" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-emerald-950/10 bg-white lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col px-4 py-6">
        <Link
          className="flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600"
          href="/"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-emerald-950"
          >
            🌱
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-emerald-950">
              KhetiConnect
            </span>
            <span className="block text-xs text-slate-500">
              Farm operations
            </span>
          </span>
        </Link>

        <div className="mt-8">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav aria-label="Primary navigation" className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-emerald-600",
                    active
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                  href={item.href}
                  key={item.href}
                >
                  <span aria-hidden="true" className="w-5 text-center">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto rounded-xl bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">
            Keep operations moving
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Review tasks, stock levels, and upcoming maintenance regularly.
          </p>
        </div>
      </div>
    </aside>
  );
}