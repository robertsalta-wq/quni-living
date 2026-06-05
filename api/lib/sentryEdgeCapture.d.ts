export function captureSentryMessageEdge(
  message: string,
  extra?: Record<string, unknown>,
): Promise<void>
