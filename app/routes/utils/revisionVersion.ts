export function formatRevisionLabel(versionNumber: number): string {
  return `R${String(versionNumber).padStart(2, "0")}`;
}
