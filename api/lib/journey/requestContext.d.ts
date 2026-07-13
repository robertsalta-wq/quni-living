export function requestContextFromRequest(
  request:
    | Request
    | { headers?: { get?: (name: string) => string | null } }
    | null
    | undefined,
): { user_agent: string; is_mobile: boolean }

export function mergeDeviceContextMetadata(
  existing: Record<string, unknown> | null | undefined,
  deviceCtx: { user_agent: string; is_mobile: boolean } | null | undefined,
): Record<string, unknown>
