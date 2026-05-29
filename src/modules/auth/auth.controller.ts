import type { Request, Response } from "express";
import { loginService, registerService } from "./auth.service";
import type { RegisterDto, LoginDto } from "./dto/auth.dto";
import { AuthError } from "./utils/auth.errors";
import { registerSchema } from "./dto/auth.schema";

export const registerController = async (req: Request, res: Response) => {
  const { email, password, name }: RegisterDto = req.body;
  const validationResult = registerSchema.safeParse({ email, password, name });
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.flatten() });
  }
  try {
    const newUser = await registerService({ email, password, name });
    res
      .status(201)
      .json({ user: newUser, message: "Usuario registrado exitosamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "EMAIL_EXISTS") {
        return res.status(409).json({ error: "El email ya está registrado" });
      }
    }
    return res.status(500).json({ error: "Error interno" });
  }
};

export const loginController = async (req: Request, res: Response) => {
  const { email, password }: LoginDto = req.body;
  try {
    const result = await loginService({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("LOGIN_ERROR:", error);
      return res.status(400).json({ error: "Credenciales inválidas" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
};
