const LOG_LIMIT = 8;

export function pushLog(entries: string[], message: string): string[] {
  const trimmed = message.trim();
  if (!trimmed) {
    return entries;
  }
  const next = [...entries, trimmed];
  if (next.length <= LOG_LIMIT) {
    return next;
  }
  return next.slice(next.length - LOG_LIMIT);
}
