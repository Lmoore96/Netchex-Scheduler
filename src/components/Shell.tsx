import type { ReactNode } from "react";
import { AdminMenu } from "./AdminMenu";
import type { SavedScheduleSummary } from "../domain/types";

interface AdminStatus {
  currentScheduleLabel: string;
  savedScheduleCount: number;
  activeCalloutCount: number;
  visibleAssignmentCount: number;
  dayAssignmentCount: number;
}

interface ShellProps {
  children: ReactNode;
  databaseConnected: boolean;
  onDatabaseConnectedChange: (connected: boolean) => void;
  adminStatus?: AdminStatus;
  savedSchedules?: SavedScheduleSummary[];
  savedScheduleError?: string;
  isLoadingSavedSchedules?: boolean;
  onRefreshSavedSchedules?: () => void | Promise<void>;
  onDeleteSavedSchedule?: (scheduleImportId: string) => void | Promise<void>;
  onDeleteSchedulesOlderThan?: (cutoffDate: string) => void | Promise<void>;
  onClearCurrentDayCallouts?: () => void;
  onClearCurrentDepartmentCallouts?: () => void;
  onRestoreAllCallouts?: () => void;
  onClearCurrentAssignments?: () => void;
  onClearDayAssignments?: () => void;
}

export function Shell({
  children,
  databaseConnected,
  onDatabaseConnectedChange,
  adminStatus,
  savedSchedules,
  savedScheduleError,
  isLoadingSavedSchedules,
  onRefreshSavedSchedules,
  onDeleteSavedSchedule,
  onDeleteSchedulesOlderThan,
  onClearCurrentDayCallouts,
  onClearCurrentDepartmentCallouts,
  onRestoreAllCallouts,
  onClearCurrentAssignments,
  onClearDayAssignments
}: ShellProps) {
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
            <AdminMenu
              databaseConnected={databaseConnected}
              onDatabaseConnectedChange={onDatabaseConnectedChange}
              status={adminStatus}
              savedSchedules={savedSchedules}
              savedScheduleError={savedScheduleError}
              isLoadingSavedSchedules={isLoadingSavedSchedules}
              onRefreshSavedSchedules={onRefreshSavedSchedules}
              onDeleteSavedSchedule={onDeleteSavedSchedule}
              onDeleteSchedulesOlderThan={onDeleteSchedulesOlderThan}
              onClearCurrentDayCallouts={onClearCurrentDayCallouts}
              onClearCurrentDepartmentCallouts={onClearCurrentDepartmentCallouts}
              onRestoreAllCallouts={onRestoreAllCallouts}
              onClearCurrentAssignments={onClearCurrentAssignments}
              onClearDayAssignments={onClearDayAssignments}
            />
          </div>
        </div>
      </header>
      <main className="shell__main">{children}</main>
    </div>
  );
}
