const consumedHighlightKeys = new Set<string>();

export function resetHighlightConsumption(taskId: string) {
  consumedHighlightKeys.delete(`highlight:${taskId}`);
}

/** Returns true only the first time this task highlight is requested in the session. */
export function consumeHighlightOnce(taskId: string): boolean {
  const key = `highlight:${taskId}`;
  if (consumedHighlightKeys.has(key)) return false;
  consumedHighlightKeys.add(key);
  return true;
}
