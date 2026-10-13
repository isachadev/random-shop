export const UNMATCHED_EVENT_CODE = "RS001"

export class UnknownUserError extends Error {
  constructor() {
    super("Your session is no longer valid. Log in again.")
    this.name = "UnknownUserError"
  }
}

export class UnmatchedEventError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = "UnmatchedEventError"
  }
}
