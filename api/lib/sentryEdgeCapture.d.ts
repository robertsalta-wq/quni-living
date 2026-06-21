export function captureSentryMessageEdge(
  message: string,
  extra?: Record<string, unknown>,
  options?: { level?: 'warning' | 'error' | 'info'; tags?: Record<string, string> },
): Promise<void>
