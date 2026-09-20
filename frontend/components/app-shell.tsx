import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}