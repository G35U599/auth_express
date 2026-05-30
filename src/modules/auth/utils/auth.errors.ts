export class AuthError extends Error {
  constructor(public code: "EMAIL_EXISTS" | "INVALID_CREDENTIALS" | "INVALID_RESET_CODE") {
    super(code);
  }
}