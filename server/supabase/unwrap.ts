import { UNMATCHED_EVENT_CODE, UnmatchedEventError } from "../errors"

interface QueryResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

export function unwrap<T>({ data, error }: QueryResult<T>): T | null {
  if (error?.code === UNMATCHED_EVENT_CODE) {
    throw new UnmatchedEventError(error.message)
  }
  if (error) throw new Error(error.message, { cause: error })
  return data
}
