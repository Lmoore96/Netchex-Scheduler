import { useState, type FormEvent } from "react";
import type { PositionDefinition } from "../domain/types";

interface PositionListEditorProps {
  departmentName: string;
  initialPositions: PositionDefinition[];
  onSave: (positions: PositionDefinition[]) => void;
}

function positionKeyFromLabel(label: string, existingKeys: Set<string>) {
  const baseKey = label
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

export function PositionListEditor({
  departmentName,
  initialPositions,
  onSave
}: PositionListEditorProps) {
  const [positions, setPositions] = useState<PositionDefinition[]>(() =>
    [...initialPositions].sort((first, second) => first.sortOrder - second.sortOrder)
  );
  const [newPositionLabel, setNewPositionLabel] = useState("");
  const trimmedLabel = newPositionLabel.trim();

  function addPosition() {
    if (!trimmedLabel) return;

    setPositions((currentPositions) => {
      const currentKeys = new Set(currentPositions.map((position) => position.key));
      const nextSortOrder =
        currentPositions.reduce((largest, position) => Math.max(largest, position.sortOrder), 0) + 1;

      return [
        ...currentPositions,
        {
          key: positionKeyFromLabel(trimmedLabel, currentKeys),
          label: trimmedLabel,
          sortOrder: nextSortOrder,
          capacityMode: "single"
        }
      ];
    });
    setNewPositionLabel("");
  }

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPosition();
  }

  return (
    <section className="panel position-list-editor" aria-labelledby="position-list-heading">
      <div className="position-list-editor__header">
        <div>
          <h2 id="position-list-heading">{departmentName} positions</h2>
          <p>Manage the positions managers can assign for this department.</p>
        </div>
      </div>

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
            </li>
          ))}
        </ul>
      ) : (
        <p className="position-list-editor__empty">No positions have been added yet.</p>
      )}

      <div className="actions">
        <button type="button" onClick={() => onSave(positions)}>
          Save list
        </button>
      </div>
    </section>
  );
}
