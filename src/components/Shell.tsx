import type { ReactNode } from "react";
import { AdminMenu } from "./AdminMenu";

interface ShellProps {
  children: ReactNode;
  databaseConnected: boolean;
  onDatabaseConnectedChange: (connected: boolean) => void;
}

export function Shell({ children, databaseConnected, onDatabaseConnectedChange }: ShellProps) {
  return (
    <div className="shell">
      <header className="shell__header no-print">
        <div className="shell__header-inner">
          <div>
            <span className="shell__eyebrow">Operations</span>
            <h1>Schedule Positions</h1>
          </div>
          <div className="shell__header-actions">
            {!databaseConnected ? <span className="shell__badge shell__badge--local">Local mode</span> : null}
            <span className="shell__badge">Netchex PDF</span>
            <AdminMenu databaseConnected={databaseConnected} onDatabaseConnectedChange={onDatabaseConnectedChange} />
          </div>
        </div>
      </header>
      <main className="shell__main">{children}</main>
    </div>
  );
}
