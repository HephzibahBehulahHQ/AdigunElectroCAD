export function toggleComponentSelection(selectedIds: string[], componentId: string): string[] {
  if (!componentId) return selectedIds;
  return selectedIds.includes(componentId) ? selectedIds.filter((id) => id !== componentId) : [...selectedIds, componentId];
}
