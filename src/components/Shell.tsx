import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__header no-print">
        <h1>Schedule Positions</h1>
      </header>
      {children}
    </div>
  );
}
