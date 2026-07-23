"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of Treasury Management Copilot activity" },
  "/client-input": { title: "Client Input", subtitle: "Enter client information to generate AI-assisted recommendations" },
  "/knowledge-base": { title: "Knowledge Base", subtitle: "ONB Treasury Management product catalog" },
  "/past-analyses": { title: "Past Analyses", subtitle: "Previously generated client recommendation reports" },
  "/settings": { title: "Settings", subtitle: "Workspace and model configuration" },
};

function resolveTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/analysis")) {
    return { title: "Analysis", subtitle: "Live multi-agent workflow and executive report" };
  }
  return { title: "Treasury Management Copilot", subtitle: "" };
}

export function TopBar() {
  const pathname = usePathname();
  const { title, subtitle } = resolveTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-xs font-medium text-foreground">Treasury Management Consultant</p>
          <p className="text-[11px] text-muted-foreground">Oceanview National Bank</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          TM
        </div>
      </div>
    </header>
  );
}
