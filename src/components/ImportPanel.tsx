import { useEffect, useState } from "react";
import type { ParsedScheduleDraft, SavedScheduleSummary } from "../domain/types";
import { uploadSchedulePdf } from "../lib/storageClient";
import { parseWhenToWorkCsv } from "../lib/whenToWorkCsv";

interface ImportPanelProps {
  onDraft: (draft: ParsedScheduleDraft) => void | Promise<void>;
  isImporting?: boolean;
  externalError?: string;
  savedSchedules?: SavedScheduleSummary[];
  onRequestSavedSchedules?: () => void | Promise<void>;
  onLoadSavedSchedule?: (scheduleImportId: string) => void | Promise<void>;
  onDeleteSavedSchedule?: (scheduleImportId: string) => void | Promise<void>;
  isLoadingSavedSchedules?: boolean;
  isLoadingSavedSchedule?: boolean;
  savedScheduleError?: string;
  databaseConnected?: boolean;
}

type ImportPanelTab = "import" | "load";

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function savedScheduleLabel(schedule: SavedScheduleSummary) {
  return `${displayDate(schedule.dateRangeStart)} - ${displayDate(schedule.dateRangeEnd)} (${schedule.shiftCount} shifts)`;
}

function readFileText(file: File) {
  if (typeof file.text === "function") return file.text();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File could not be read")));
    reader.readAsText(file);
  });
}

export function ImportPanel({
  onDraft,
  isImporting = false,
  externalError = "",
  savedSchedules = [],
  onRequestSavedSchedules,
  onLoadSavedSchedule,
  onDeleteSavedSchedule,
  isLoadingSavedSchedules = false,
  isLoadingSavedSchedule = false,
  savedScheduleError = "",
  databaseConnected = true
}: ImportPanelProps) {
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportPanelTab>("import");
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
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".csv") || file.type.includes("csv")) {
        await onDraft(parseWhenToWorkCsv(await readFileText(file), file.name));
      } else if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
        await onDraft(await uploadSchedulePdf(file));
      } else {
        throw new Error("Upload a PDF or CSV schedule file.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function selectTab(nextTab: ImportPanelTab) {
    setActiveTab(nextTab);
    if (nextTab === "load") {
      await onRequestSavedSchedules?.();
    }
  }

  async function loadSelectedSchedule() {
    if (!selectedScheduleId) return;
    await onLoadSavedSchedule?.(selectedScheduleId);
  }

  async function deleteSelectedSchedule() {
    if (!selectedScheduleId) return;
    const shouldDelete = window.confirm("Delete this saved schedule? This cannot be undone.");
    if (!shouldDelete) return;
    await onDeleteSavedSchedule?.(selectedScheduleId);
  }

  return (
    <section className="panel import-panel">
      <h2>Upload schedule</h2>
      <div className="import-panel__tabs" role="tablist" aria-label="Schedule source">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "import"}
          className={activeTab === "import" ? "is-active" : undefined}
          onClick={() => void selectTab("import")}
        >
          Import
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "load"}
          className={activeTab === "load" ? "is-active" : undefined}
          onClick={() => void selectTab("load")}
        >
          {databaseConnected ? "Load Saved" : "Load Local"}
        </button>
      </div>

      {activeTab === "import" ? (
        <div className="import-panel__tab-panel" role="tabpanel">
          <label className="upload">
            <span>Import PDF or CSV</span>
            <input
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              disabled={isBusy}
              aria-label="Import PDF or CSV"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
        </div>
      ) : null}

      {activeTab === "load" ? (
        <div className="import-panel__tab-panel import-panel__saved" role="tabpanel">
          <div className="import-panel__saved-picker">
            <label htmlFor="saved-schedule-select">{databaseConnected ? "Saved schedule" : "Saved on this device"}</label>
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
              <button type="button" className="button-danger" disabled={isBusy || isLoadingSavedSchedules || !selectedScheduleId} onClick={() => void deleteSelectedSchedule()}>
                Delete
              </button>
            </div>
            {!databaseConnected ? <p>Local schedules are available only in this browser.</p> : null}
          </div>
        </div>
      ) : null}

      {isBusy || isLoadingSavedSchedules ? <p role="status">{isLoadingSavedSchedules ? "Loading saved schedules..." : "Reading and importing schedule..."}</p> : null}
      {error || externalError || savedScheduleError ? <p role="alert">{error || externalError || savedScheduleError}</p> : null}
    </section>
  );
}
