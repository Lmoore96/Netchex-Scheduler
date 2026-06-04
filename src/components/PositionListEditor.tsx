import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { PositionDefinition, PositionList } from "../domain/types";
import { WorkflowActionsPortal } from "./WorkflowActionsPortal";

interface PositionListEditorProps {
  departmentName: string;
  initialPositions?: PositionDefinition[];
  onSave?: (positions: PositionDefinition[]) => void | Promise<void>;
  positionLists?: PositionList[];
  selectedListId?: string;
  onSelectList?: (listId: string) => void;
  onCreateList?: (name: string) => void | Promise<void>;
  onDeleteList?: (list: PositionList) => void | Promise<void>;
  onSaveList?: (list: PositionList) => void | Promise<void>;
}

type CapacityMode = PositionDefinition["capacityMode"];
type SaveState = "idle" | "dirty" | "saving" | "saved" | "deleting" | "deleted" | "error";

function positionKeyFromLabel(label: string, existingKeys: Set<string>) {
  const baseKey =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "position";

  let nextKey = baseKey;
  let suffix = 2;
  while (existingKeys.has(nextKey)) {
    nextKey = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  return nextKey;
}

function sortPositions(positions: PositionDefinition[]) {
  return [...positions].sort((first, second) => first.sortOrder - second.sortOrder);
}

function normalizeSortOrder(positions: PositionDefinition[]) {
  return positions.map((position, index) => ({ ...position, sortOrder: index + 1 }));
}

function saveMessage(saveState: SaveState) {
  if (saveState === "dirty") return "Unsaved changes";
  if (saveState === "saving") return "Saving...";
  if (saveState === "saved") return "List saved.";
  if (saveState === "deleting") return "Deleting...";
  if (saveState === "deleted") return "List deleted.";
  if (saveState === "error") return "Action failed. Try again.";
  return "";
}

export function PositionListEditor({
  departmentName,
  initialPositions = [],
  onSave,
  positionLists = [],
  selectedListId = "",
  onSelectList,
  onCreateList,
  onDeleteList,
  onSaveList
}: PositionListEditorProps) {
  const selectedList = useMemo(
    () => positionLists.find((list) => list.id === selectedListId) ?? positionLists[0],
    [positionLists, selectedListId]
  );
  const sourcePositions = selectedList?.positions ?? initialPositions;
  const singleCount = sourcePositions.filter((position) => position.capacityMode === "single").length;
  const multipleCount = sourcePositions.filter((position) => position.capacityMode === "multiple").length;
  const [positions, setPositions] = useState<PositionDefinition[]>(() => sortPositions(sourcePositions));
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [newPositionLabel, setNewPositionLabel] = useState("");
  const [newPositionCapacityMode, setNewPositionCapacityMode] = useState<CapacityMode>("single");
  const [newListName, setNewListName] = useState("");
  const trimmedLabel = newPositionLabel.trim();
  const trimmedListName = newListName.trim();
  const statusMessage = saveMessage(saveState);

  useEffect(() => {
    setPositions(sortPositions(sourcePositions));
    setIsEditing(false);
    setNewPositionLabel("");
    setNewPositionCapacityMode("single");
  }, [selectedList?.id, sourcePositions]);

  function markDirty() {
    setSaveState("dirty");
  }

  function addPosition() {
    if (!trimmedLabel) return;

    setPositions((currentPositions) => {
      const currentKeys = new Set(currentPositions.map((position) => position.key));

      return [
        ...currentPositions,
        {
          key: positionKeyFromLabel(trimmedLabel, currentKeys),
          label: trimmedLabel,
          sortOrder: currentPositions.length + 1,
          capacityMode: newPositionCapacityMode
        }
      ];
    });
    setNewPositionLabel("");
    setNewPositionCapacityMode("single");
    markDirty();
  }

  function removePosition(positionKey: string) {
    setPositions((currentPositions) =>
      normalizeSortOrder(currentPositions.filter((position) => position.key !== positionKey))
    );
    markDirty();
  }

  function updatePositionCapacityMode(positionKey: string, capacityMode: CapacityMode) {
    setPositions((currentPositions) =>
      currentPositions.map((position) =>
        position.key === positionKey ? { ...position, capacityMode } : position
      )
    );
    markDirty();
  }

  async function saveList() {
    const sortedPositions = normalizeSortOrder(positions);
    setPositions(sortedPositions);
    setSaveState("saving");

    try {
      if (selectedList && onSaveList) {
        await onSaveList({ ...selectedList, positions: sortedPositions });
      } else {
        await onSave?.(sortedPositions);
      }
      setSaveState("saved");
      setIsEditing(false);
    } catch {
      setSaveState("error");
    }
  }

  async function deleteList() {
    if (!selectedList || !onDeleteList) return;

    const shouldDelete = window.confirm(`Delete "${selectedList.name}"? This cannot be undone.`);
    if (!shouldDelete) return;

    setSaveState("deleting");
    try {
      await onDeleteList(selectedList);
      setIsEditing(false);
      setSaveState("deleted");
    } catch {
      setSaveState("error");
    }
  }

  function cancelEditing() {
    setPositions(sortPositions(sourcePositions));
    setNewPositionLabel("");
    setNewPositionCapacityMode("single");
    setSaveState("idle");
    setIsEditing(false);
  }

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPosition();
  }

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedListName) return;

    setSaveState("saving");
    try {
      await onCreateList?.(trimmedListName);
      setNewListName("");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="panel position-list-editor" aria-labelledby="position-list-heading">
      <div className="position-list-editor__header">
        <div>
          <h2 id="position-list-heading">{departmentName} positions</h2>
          <p>Choose a saved list, then edit it only when changes are needed.</p>
        </div>
      </div>

      <WorkflowActionsPortal>
        <div className="header-actions position-list-editor__header-actions" role="group" aria-label="Header actions">
          {statusMessage ? (
            <p className={`position-list-editor__status position-list-editor__status--${saveState}`} role="status">
              {statusMessage}
            </p>
          ) : null}
          {isEditing ? (
            <>
              <button
                type="button"
                className="button-primary"
                onClick={() => void saveList()}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Saving..." : "Save list"}
              </button>
              <button type="button" onClick={cancelEditing} disabled={saveState === "saving"}>
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </WorkflowActionsPortal>

      <div className="position-list-editor__summary">
        {positionLists.length > 0 ? (
          <div className="position-list-editor__list-tools">
            <label htmlFor="position-list-select">Position list</label>
            <select
              id="position-list-select"
              value={selectedList?.id ?? ""}
              onChange={(event) => {
                onSelectList?.(event.target.value);
                setSaveState("idle");
              }}
            >
              {positionLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <article className="position-list-editor__summary-card">
          <div>
            <span>Selected list</span>
            <strong>{selectedList?.name ?? "No list selected"}</strong>
          </div>
          <dl>
            <div>
              <dt>Positions</dt>
              <dd>{sourcePositions.length}</dd>
            </div>
            <div>
              <dt>Single</dt>
              <dd>{singleCount}</dd>
            </div>
            <div>
              <dt>Multiple</dt>
              <dd>{multipleCount}</dd>
            </div>
          </dl>
          <div className="position-list-editor__summary-actions">
            <button type="button" disabled={!selectedList} onClick={() => setIsEditing(true)}>
              Edit list
            </button>
            <button
              type="button"
              className="button-danger"
              disabled={!selectedList || saveState === "deleting"}
              onClick={() => void deleteList()}
            >
              Delete list
            </button>
          </div>
        </article>
      </div>

      {onCreateList ? (
        <form className="position-list-editor__form" onSubmit={handleCreateList}>
          <label htmlFor="new-position-list">New list</label>
          <input
            id="new-position-list"
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
          />
          <button type="submit" disabled={!trimmedListName || saveState === "saving"}>
            Create list
          </button>
        </form>
      ) : null}

      {isEditing ? (
        <div className="position-list-editor__editing">
          <form className="position-list-editor__form" onSubmit={handleAddSubmit}>
            <label htmlFor="new-position">New position</label>
            <input
              id="new-position"
              value={newPositionLabel}
              onChange={(event) => setNewPositionLabel(event.target.value)}
            />
            <label htmlFor="new-position-capacity">Capacity</label>
            <select
              id="new-position-capacity"
              value={newPositionCapacityMode}
              onChange={(event) => setNewPositionCapacityMode(event.target.value as CapacityMode)}
            >
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </select>
            <button type="submit" disabled={!trimmedLabel}>
              Add position
            </button>
          </form>

          {positions.length > 0 ? (
            <ul className="position-list-editor__positions" aria-label={`${departmentName} position list`}>
              {positions.map((position) => (
                <li key={position.key}>
                  <span>{position.label}</span>
                  <label>
                    <span>Capacity</span>
                    <select
                      aria-label={`Capacity for ${position.label}`}
                      value={position.capacityMode}
                      onChange={(event) =>
                        updatePositionCapacityMode(position.key, event.target.value as CapacityMode)
                      }
                    >
                      <option value="single">Single</option>
                      <option value="multiple">Multiple</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => removePosition(position.key)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="position-list-editor__empty">No positions have been added yet.</p>
          )}

        </div>
      ) : null}
    </section>
  );
}
