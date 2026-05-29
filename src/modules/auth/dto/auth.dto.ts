export type RegisterDto = {
  email: string;
  name?: string;
  password: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type ForgotPasswordDto = {
  email: string;
};

export type ResetPasswordDto = {
  email: string;
  code: string;
  newPassword: string;
};
