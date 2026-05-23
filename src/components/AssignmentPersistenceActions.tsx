export type PersistenceState = "idle" | "saving" | "saved" | "loading" | "loaded" | "empty" | "error";

interface AssignmentPersistenceActionsProps {
  canUse: boolean;
  saveState: PersistenceState;
  onSave: () => void | Promise<void>;
  onLoad: () => void | Promise<void>;
}

function statusMessage(saveState: PersistenceState) {
  if (saveState === "saving") return "Saving assignments...";
  if (saveState === "saved") return "Assignments saved.";
  if (saveState === "loading") return "Loading saved assignments...";
  if (saveState === "loaded") return "Saved assignments loaded.";
  if (saveState === "empty") return "No saved assignments found for this view.";
  if (saveState === "error") return "Assignments could not be saved or loaded.";
  return "";
}

export function AssignmentPersistenceActions({
  canUse,
  saveState,
  onSave,
  onLoad
}: AssignmentPersistenceActionsProps) {
  const isBusy = saveState === "saving" || saveState === "loading";
  const message = statusMessage(saveState);

  return (
    <div className="assignment-persistence no-print">
      <div className="assignment-persistence__actions">
        <button type="button" disabled={!canUse || isBusy} onClick={() => void onSave()}>
          Save assignments
        </button>
        <button type="button" disabled={!canUse || isBusy} onClick={() => void onLoad()}>
          Load saved assignments
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
