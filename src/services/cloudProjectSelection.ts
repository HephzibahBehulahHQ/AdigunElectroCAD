export interface CloudProjectSelection { userId: string; projectId: string; }
type SelectionStorage = Pick<Storage, "getItem" | "setItem">;
const key = (userId: string) => `adigun-electro-cad.cloud-project-id.v2.${encodeURIComponent(userId)}`;

export function selectedCloudProjectId(selection: CloudProjectSelection | null, userId: string | null | undefined): string {
  return userId && selection?.userId === userId ? selection.projectId : "";
}

export function readCloudProjectSelection(storage: SelectionStorage, userId: string | null | undefined): CloudProjectSelection | null {
  if (!userId) return null;
  try { return { userId, projectId: storage.getItem(key(userId)) ?? "" }; }
  catch { return { userId, projectId: "" }; }
}

export function rememberCloudProjectSelection(storage: SelectionStorage, selection: CloudProjectSelection): boolean {
  try { storage.setItem(key(selection.userId), selection.projectId); return true; }
  catch { return false; }
}
