import { failure, success, type Result } from "@/domain/result"

const GENERIC_ERROR = "Something went wrong. Please try again."

async function readError(response: Response): Promise<string> {
  if (response.status >= 500) return GENERIC_ERROR

  const body: unknown = await response.json().catch(() => null)
  const message = (body as { error?: unknown } | null)?.error
  return typeof message === "string" ? message : GENERIC_ERROR
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<Result<T>> {
  try {
    const response = await fetch(`/api${path}`, init)
    if (!response.ok) return failure(await readError(response))
    return success((await response.json()) as T)
  } catch {
    return failure("Network error. Check your connection.")
  }
}
