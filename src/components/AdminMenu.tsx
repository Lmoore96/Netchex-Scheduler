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

type AdminSection = "schedules" | "callouts" | "assignments";

function sectionButtonLabel(title: string, count: string) {
  return `${title} ${count}`;
}

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
  const [openSection, setOpenSection] = useState<AdminSection | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [deleteBeforeDate, setDeleteBeforeDate] = useState("");
  const canDeleteSelectedSchedule = Boolean(selectedScheduleId && onDeleteSavedSchedule);
  const canDeleteOlderSchedules = Boolean(deleteBeforeDate && onDeleteSchedulesOlderThan);
  const storageModeLabel = databaseConnected ? "Supabase" : "Local";

  function toggleSection(section: AdminSection) {
    setOpenSection((current) => (current === section ? null : section));
  }

  return (
    <div className="admin-menu">
      <button type="button" className="admin-menu__trigger" onClick={() => setIsOpen((current) => !current)}>
        Admin
      </button>
      {isOpen ? (
        <div className="admin-menu__panel" role="dialog" aria-label="Admin settings">
          <div className="admin-menu__intro">
            <h2>Admin</h2>
            <p>{databaseConnected ? "Database mode is active." : "Local mode: data stays on this device"}</p>
          </div>

          <section className="admin-menu__summary" aria-label="Storage status">
            <div>
              <span>Storage</span>
              <strong>{storageModeLabel}</strong>
            </div>
            <div>
              <span>Schedule</span>
              <strong>{status.currentScheduleLabel}</strong>
            </div>
            <dl>
              <div>
                <dt>Saved schedules</dt>
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

          <div className="admin-menu__disclosures">
            <section className="admin-menu__section" aria-label="Saved schedule cleanup tools">
              <button
                type="button"
                className="admin-menu__disclosure"
                aria-expanded={openSection === "schedules"}
                onClick={() => toggleSection("schedules")}
              >
                <span>
                  <strong>{sectionButtonLabel("Schedules", String(status.savedScheduleCount))}</strong>
                  <small>Review imports and remove old saved schedules.</small>
                </span>
                <b>{openSection === "schedules" ? "Hide" : "Show"}</b>
              </button>
              {openSection === "schedules" ? (
                <div className="admin-menu__section-body">
                  <button type="button" onClick={() => void onRefreshSavedSchedules?.()} disabled={!onRefreshSavedSchedules || isLoadingSavedSchedules}>
                    {isLoadingSavedSchedules ? "Refreshing..." : "Refresh"}
                  </button>
                  <label>
                    <span>Saved schedule</span>
                    <select value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)}>
                      <option value="">Choose schedule</option>
                      {savedSchedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.sourceFileName} · {schedule.dateRangeStart} to {schedule.dateRangeEnd}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="button-danger" onClick={() => void onDeleteSavedSchedule?.(selectedScheduleId)} disabled={!canDeleteSelectedSchedule}>
                    Delete selected
                  </button>
                  <label>
                    <span>Ending before</span>
                    <input type="date" value={deleteBeforeDate} onChange={(event) => setDeleteBeforeDate(event.target.value)} />
                  </label>
                  <button type="button" className="button-danger" onClick={() => void onDeleteSchedulesOlderThan?.(deleteBeforeDate)} disabled={!canDeleteOlderSchedules}>
                    Delete old
                  </button>
                  {savedScheduleError ? <p role="alert">{savedScheduleError}</p> : null}
                </div>
              ) : null}
            </section>

            <section className="admin-menu__section" aria-label="Callout tools">
              <button
                type="button"
                className="admin-menu__disclosure"
                aria-expanded={openSection === "callouts"}
                onClick={() => toggleSection("callouts")}
              >
                <span>
                  <strong>{sectionButtonLabel("Callouts", String(status.activeCalloutCount))}</strong>
                  <small>Reset removed people for the day or department.</small>
                </span>
                <b>{openSection === "callouts" ? "Hide" : "Show"}</b>
              </button>
              {openSection === "callouts" ? (
                <div className="admin-menu__button-grid admin-menu__section-body">
                  <button type="button" onClick={onClearCurrentDayCallouts} disabled={!onClearCurrentDayCallouts || status.activeCalloutCount === 0}>
                    Clear day
                  </button>
                  <button type="button" onClick={onClearCurrentDepartmentCallouts} disabled={!onClearCurrentDepartmentCallouts || status.activeCalloutCount === 0}>
                    Clear department
                  </button>
                  <button type="button" onClick={onRestoreAllCallouts} disabled={!onRestoreAllCallouts || status.activeCalloutCount === 0}>
                    Restore all
                  </button>
                </div>
              ) : null}
            </section>

            <section className="admin-menu__section" aria-label="Assignment cleanup tools">
              <button
                type="button"
                className="admin-menu__disclosure"
                aria-expanded={openSection === "assignments"}
                onClick={() => toggleSection("assignments")}
              >
                <span>
                  <strong>{sectionButtonLabel("Assignments", String(status.visibleAssignmentCount))}</strong>
                  <small>Clear current work without changing the imported schedule.</small>
                </span>
                <b>{openSection === "assignments" ? "Hide" : "Show"}</b>
              </button>
              {openSection === "assignments" ? (
                <div className="admin-menu__button-grid admin-menu__section-body">
                  <button type="button" onClick={onClearCurrentAssignments} disabled={!onClearCurrentAssignments || status.visibleAssignmentCount === 0}>
                    Clear current
                  </button>
                  <button type="button" onClick={onClearDayAssignments} disabled={!onClearDayAssignments || status.dayAssignmentCount === 0}>
                    Clear day
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
