import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__header no-print">
        <div className="shell__header-inner">
          <div>
            <span className="shell__eyebrow">Operations</span>
            <h1>Schedule Positions</h1>
          </div>
          <span className="shell__badge">Netchex PDF</span>
        </div>
      </header>
      <main className="shell__main">{children}</main>
    </div>
  );
}
