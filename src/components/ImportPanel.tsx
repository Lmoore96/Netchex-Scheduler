import { useEffect, useState } from "react";
import type { ParsedScheduleDraft, SavedScheduleSummary } from "../domain/types";
import { uploadSchedulePdf } from "../lib/storageClient";

interface ImportPanelProps {
  onDraft: (draft: ParsedScheduleDraft) => void | Promise<void>;
  isImporting?: boolean;
  externalError?: string;
  savedSchedules?: SavedScheduleSummary[];
  onRequestSavedSchedules?: () => void | Promise<void>;
  onLoadSavedSchedule?: (scheduleImportId: string) => void | Promise<void>;
  isLoadingSavedSchedules?: boolean;
  isLoadingSavedSchedule?: boolean;
  savedScheduleError?: string;
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function savedScheduleLabel(schedule: SavedScheduleSummary) {
  return `${displayDate(schedule.dateRangeStart)} - ${displayDate(schedule.dateRangeEnd)} (${schedule.shiftCount} shifts)`;
}

export function ImportPanel({
  onDraft,
  isImporting = false,
  externalError = "",
  savedSchedules = [],
  onRequestSavedSchedules,
  onLoadSavedSchedule,
  isLoadingSavedSchedules = false,
  isLoadingSavedSchedule = false,
  savedScheduleError = ""
}: ImportPanelProps) {
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showSavedSchedules, setShowSavedSchedules] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const isBusy = isUploading || isImporting || isLoadingSavedSchedule;

  useEffect(() => {
    const selectedScheduleStillExists = savedSchedules.some((schedule) => schedule.id === selectedScheduleId);
    if (savedSchedules[0] && !selectedScheduleStillExists) {
      setSelectedScheduleId(savedSchedules[0].id);
    }
    if (savedSchedules.length === 0 && selectedScheduleId) {
      setSelectedScheduleId("");
    }
  }, [savedSchedules, selectedScheduleId]);

  async function handleFile(file: File) {
    setError("");
    setIsUploading(true);
    try {
      await onDraft(await uploadSchedulePdf(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function showSavedSchedulePicker() {
    setShowSavedSchedules((current) => !current);
    if (!showSavedSchedules) {
      await onRequestSavedSchedules?.();
    }
  }

  async function loadSelectedSchedule() {
    if (!selectedScheduleId) return;
    await onLoadSavedSchedule?.(selectedScheduleId);
  }

  return (
    <section className="panel import-panel">
      <h2>Upload schedule</h2>
      <div className="import-panel__grid">
        <label className="upload">
          <span>Import PDF</span>
          <input
            type="file"
            accept="application/pdf"
            disabled={isBusy}
            aria-label="Import PDF"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>

        <div className="import-panel__saved">
          <button type="button" disabled={isBusy} onClick={() => void showSavedSchedulePicker()}>
            Load saved schedule
          </button>
          {showSavedSchedules ? (
            <div className="import-panel__saved-picker">
              <label htmlFor="saved-schedule-select">Saved schedule</label>
              <select
                id="saved-schedule-select"
                value={selectedScheduleId}
                disabled={isBusy || isLoadingSavedSchedules || savedSchedules.length === 0}
                onChange={(event) => setSelectedScheduleId(event.target.value)}
              >
                {savedSchedules.length === 0 ? <option value="">No saved schedules found</option> : null}
                {savedSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>{savedScheduleLabel(schedule)}</option>
                ))}
              </select>
              <div className="import-panel__saved-actions">
                <button type="button" disabled={isBusy || isLoadingSavedSchedules} onClick={() => void onRequestSavedSchedules?.()}>
                  Refresh
                </button>
                <button type="button" disabled={isBusy || isLoadingSavedSchedules || !selectedScheduleId} onClick={() => void loadSelectedSchedule()}>
                  Load schedule
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {isBusy || isLoadingSavedSchedules ? <p role="status">{isLoadingSavedSchedules ? "Loading saved schedules..." : "Reading and importing schedule..."}</p> : null}
      {error || externalError || savedScheduleError ? <p role="alert">{error || externalError || savedScheduleError}</p> : null}
    </section>
  );
}
