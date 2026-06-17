import type { PositionDefinition, PositionList } from "./types";

export const starterPositions: PositionDefinition[] = [
  { key: "lead", label: "Lead", sortOrder: 0, capacityMode: "single" },
  { key: "starter", label: "Starter", sortOrder: 1, capacityMode: "multiple" }
];

const configuredDefaultsByDepartment: Record<string, Array<Omit<PositionDefinition, "key" | "sortOrder">>> = {
  Cashiers: [
    { label: "Season Pass", capacityMode: "multiple" },
    { label: "Cafe", capacityMode: "multiple" },
    { label: "Pizza", capacityMode: "multiple" },
    { label: "Crew Window", capacityMode: "multiple" },
    { label: "Pollys", capacityMode: "single" },
    { label: "Mini Melts", capacityMode: "single" },
    { label: "Ice Cream", capacityMode: "single" },
    { label: "Breaker", capacityMode: "multiple" }
  ],
  "Splash Crew": [
    { label: "Office", capacityMode: "multiple" },
    { label: "Bar", capacityMode: "single" },
    { label: "Gift Shop", capacityMode: "single" },
    { label: "Cabana Check in", capacityMode: "single" },
    { label: "Out of Park Questions", capacityMode: "multiple" }
  ]
};

export function departmentIdFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "department";
}

function positionKeyFromLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "position";
}

function positionsForDepartment(departmentName: string) {
  const configuredPositions = configuredDefaultsByDepartment[departmentName];

  if (!configuredPositions) {
    return starterPositions.map((position, index) => ({ ...position, sortOrder: index + 1 }));
  }

  return configuredPositions.map((position, index) => ({
    key: positionKeyFromLabel(position.label),
    label: position.label,
    sortOrder: index + 1,
    capacityMode: position.capacityMode
  }));
}

export function defaultListForDepartment(departmentName: string): PositionList {
  const departmentId = departmentIdFromName(departmentName);
  return {
    id: `${departmentId}-default`,
    departmentId,
    name: "Default list",
    positions: positionsForDepartment(departmentName)
  };
}
