import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { PositionDefinition, PositionList } from "../domain/types";

interface PositionListEditorProps {
  departmentName: string;
  initialPositions?: PositionDefinition[];
  onSave?: (positions: PositionDefinition[]) => void;
  positionLists?: PositionList[];
  selectedListId?: string;
  onSelectList?: (listId: string) => void;
  onCreateList?: (name: string) => void;
  onSaveList?: (list: PositionList) => void;
}

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

export function PositionListEditor({
  departmentName,
  initialPositions = [],
  onSave,
  positionLists = [],
  selectedListId = "",
  onSelectList,
  onCreateList,
  onSaveList
}: PositionListEditorProps) {
  const selectedList = useMemo(
    () => positionLists.find((list) => list.id === selectedListId) ?? positionLists[0],
    [positionLists, selectedListId]
  );
  const sourcePositions = selectedList?.positions ?? initialPositions;
  const [positions, setPositions] = useState<PositionDefinition[]>(() => sortPositions(sourcePositions));
  const [newPositionLabel, setNewPositionLabel] = useState("");
  const [newListName, setNewListName] = useState("");
  const trimmedLabel = newPositionLabel.trim();
  const trimmedListName = newListName.trim();

  useEffect(() => {
    setPositions(sortPositions(sourcePositions));
  }, [selectedList?.id, sourcePositions]);

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
          capacityMode: "single"
        }
      ];
    });
    setNewPositionLabel("");
  }

  function removePosition(positionKey: string) {
    setPositions((currentPositions) =>
      normalizeSortOrder(currentPositions.filter((position) => position.key !== positionKey))
    );
  }

  function saveList() {
    const sortedPositions = normalizeSortOrder(positions);
    setPositions(sortedPositions);

    if (selectedList && onSaveList) {
      onSaveList({ ...selectedList, positions: sortedPositions });
      return;
    }

    onSave?.(sortedPositions);
  }

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPosition();
  }

  function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedListName) return;

    onCreateList?.(trimmedListName);
    setNewListName("");
  }

  return (
    <section className="panel position-list-editor" aria-labelledby="position-list-heading">
      <div className="position-list-editor__header">
        <div>
          <h2 id="position-list-heading">{departmentName} positions</h2>
          <p>Manage the positions managers can assign for this department.</p>
        </div>
      </div>

      {positionLists.length > 0 ? (
        <div className="position-list-editor__list-tools">
          <label htmlFor="position-list-select">Position list</label>
          <select
            id="position-list-select"
            value={selectedList?.id ?? ""}
            onChange={(event) => onSelectList?.(event.target.value)}
          >
            {positionLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {onCreateList ? (
        <form className="position-list-editor__form" onSubmit={handleCreateList}>
          <label htmlFor="new-position-list">New list</label>
          <input
            id="new-position-list"
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
          />
          <button type="submit" disabled={!trimmedListName}>
            Create list
          </button>
        </form>
      ) : null}

      <form className="position-list-editor__form" onSubmit={handleAddSubmit}>
        <label htmlFor="new-position">New position</label>
        <input
          id="new-position"
          value={newPositionLabel}
          onChange={(event) => setNewPositionLabel(event.target.value)}
        />
        <button type="submit" disabled={!trimmedLabel}>
          Add position
        </button>
      </form>

      {positions.length > 0 ? (
        <ul className="position-list-editor__positions" aria-label={`${departmentName} position list`}>
          {positions.map((position) => (
            <li key={position.key}>
              <span>{position.label}</span>
              <span>{position.capacityMode === "single" ? "Single" : "Multiple"}</span>
              <button type="button" onClick={() => removePosition(position.key)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="position-list-editor__empty">No positions have been added yet.</p>
      )}

      <div className="actions">
        <button type="button" onClick={saveList}>
          Save list
        </button>
      </div>
    </section>
  );
}
