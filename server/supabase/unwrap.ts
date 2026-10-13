interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
}

export function unwrap<T>({ data, error }: QueryResult<T>): T | null {
  if (error) throw new Error(error.message, { cause: error })
  return data
}
