import { useState } from "react";
import type { SavedScheduleSummary } from "../domain/types";

interface AdminStatus {
  currentScheduleLabel: string;
  savedScheduleCount: number;
  activeCalloutCount: number;
  visibleAssignmentCount: number;
  dayAssignmentCount: number;
}

interface AdminMenuProps {
  databaseConnected: boolean;
  onDatabaseConnectedChange: (connected: boolean) => void;
  status?: AdminStatus;
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

const defaultStatus: AdminStatus = {
  currentScheduleLabel: "No schedule loaded",
  savedScheduleCount: 0,
  activeCalloutCount: 0,
  visibleAssignmentCount: 0,
  dayAssignmentCount: 0
};

export function AdminMenu({
  databaseConnected,
  onDatabaseConnectedChange,
  status = defaultStatus,
  savedSchedules = [],
  savedScheduleError = "",
  isLoadingSavedSchedules = false,
  onRefreshSavedSchedules,
  onDeleteSavedSchedule,
  onDeleteSchedulesOlderThan,
  onClearCurrentDayCallouts,
  onClearCurrentDepartmentCallouts,
  onRestoreAllCallouts,
  onClearCurrentAssignments,
  onClearDayAssignments
}: AdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [deleteBeforeDate, setDeleteBeforeDate] = useState("");
  const canDeleteSelectedSchedule = Boolean(selectedScheduleId && onDeleteSavedSchedule);
  const canDeleteOlderSchedules = Boolean(deleteBeforeDate && onDeleteSchedulesOlderThan);

  return (
    <div className="admin-menu">
      <button type="button" className="admin-menu__trigger" onClick={() => setIsOpen((current) => !current)}>
        Admin
      </button>
      {isOpen ? (
        <div className="admin-menu__panel" role="dialog" aria-label="Admin settings">
          <div>
            <h2>Admin</h2>
            <p>{databaseConnected ? "Database mode is active." : "Local mode: data stays on this device"}</p>
          </div>

          <section className="admin-menu__section" aria-label="Storage status">
            <h3>Storage status</h3>
            <dl className="admin-menu__stats">
              <div>
                <dt>Schedule</dt>
                <dd>{status.currentScheduleLabel}</dd>
              </div>
              <div>
                <dt>Saved</dt>
                <dd>{status.savedScheduleCount} saved schedules</dd>
              </div>
              <div>
                <dt>Callouts</dt>
                <dd>{status.activeCalloutCount} active callouts</dd>
              </div>
              <div>
                <dt>Assignments</dt>
                <dd>{status.visibleAssignmentCount} current assignments</dd>
              </div>
            </dl>
          </section>

          <div className="admin-menu__setting">
            <div>
              <strong>Database connected</strong>
              <span>{databaseConnected ? "Uses Supabase storage" : "Uses this browser only"}</span>
            </div>
            <button
              type="button"
              className="admin-menu__switch"
              role="switch"
              aria-checked={databaseConnected}
              aria-label="Database connected"
              onClick={() => onDatabaseConnectedChange(!databaseConnected)}
            >
              <span aria-hidden="true" />
            </button>
          </div>

          <section className="admin-menu__section" aria-label="Saved schedule cleanup tools">
            <h3>Saved schedule cleanup</h3>
            <button type="button" onClick={() => void onRefreshSavedSchedules?.()} disabled={!onRefreshSavedSchedules || isLoadingSavedSchedules}>
              {isLoadingSavedSchedules ? "Refreshing..." : "Refresh schedules"}
            </button>
            <label>
              <span>Saved schedule cleanup</span>
              <select value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)}>
                <option value="">Choose schedule</option>
                {savedSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.sourceFileName} · {schedule.dateRangeStart} to {schedule.dateRangeEnd}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void onDeleteSavedSchedule?.(selectedScheduleId)} disabled={!canDeleteSelectedSchedule}>
              Delete selected schedule
            </button>
            <label>
              <span>Delete schedules ending before</span>
              <input type="date" value={deleteBeforeDate} onChange={(event) => setDeleteBeforeDate(event.target.value)} />
            </label>
            <button type="button" onClick={() => void onDeleteSchedulesOlderThan?.(deleteBeforeDate)} disabled={!canDeleteOlderSchedules}>
              Delete older schedules
            </button>
            {savedScheduleError ? <p role="alert">{savedScheduleError}</p> : null}
          </section>

          <section className="admin-menu__section" aria-label="Callout tools">
            <h3>Callouts</h3>
            <div className="admin-menu__button-grid">
              <button type="button" onClick={onClearCurrentDayCallouts} disabled={!onClearCurrentDayCallouts || status.activeCalloutCount === 0}>
                Clear day callouts
              </button>
              <button type="button" onClick={onClearCurrentDepartmentCallouts} disabled={!onClearCurrentDepartmentCallouts || status.activeCalloutCount === 0}>
                Clear department callouts
              </button>
              <button type="button" onClick={onRestoreAllCallouts} disabled={!onRestoreAllCallouts || status.activeCalloutCount === 0}>
                Restore everyone
              </button>
            </div>
          </section>

          <section className="admin-menu__section" aria-label="Assignment cleanup tools">
            <h3>Assignments</h3>
            <div className="admin-menu__button-grid">
              <button type="button" onClick={onClearCurrentAssignments} disabled={!onClearCurrentAssignments || status.visibleAssignmentCount === 0}>
                Clear current assignments
              </button>
              <button type="button" onClick={onClearDayAssignments} disabled={!onClearDayAssignments || status.dayAssignmentCount === 0}>
                Clear day assignments
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
