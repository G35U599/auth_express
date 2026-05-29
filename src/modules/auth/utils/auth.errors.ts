export class AuthError extends Error {
  constructor(public code: "EMAIL_EXISTS" | "INVALID_CREDENTIALS") {
    super(code);
  }
}