import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z
    .string()
    .min(8)
    .regex(/[a-z]/, "Debe tener al menos una minuscula")
    .regex(/[A-Z]/, "Debe tener al menos una mayuscula")
    .regex(/[0-9]/, "Debe tener al menos un numero")
    .regex(/[^A-Za-z0-9]/, "Debe tener al menos un caracter especial"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});
