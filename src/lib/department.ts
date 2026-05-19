export function normalizeDepartmentLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}
