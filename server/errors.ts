export class UnknownUserError extends Error {
  constructor() {
    super("Your session is no longer valid. Log in again.")
    this.name = "UnknownUserError"
  }
}
