import type { Request, Response } from "express";
import { loginService, registerService } from "./auth.service";
import type { RegisterDto, LoginDto } from "./dto/auth.dto";
import { AuthError } from "./utils/auth.errors";
import { registerSchema } from "./dto/auth.schema";
import type { ForgotPasswordDto, ResetPasswordDto } from "./dto/auth.dto";
import { forgotPasswordSchema, resetPasswordSchema } from "./dto/auth.schema";
import { forgotPasswordService, resetPasswordService } from "./auth.service";
import redisClient from "../../config/redis";
import { rateLimit } from "../../shared/utils/rate-limit";

const FORGOT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutos
const FORGOT_RATE_LIMIT_MAX = 3;

const buildForgotRateKey = (email: string, ip: string) =>
  `rate:forgot:${email}:${ip}`;

/*
 * Registro: validar que el email no exista, hashear la contraseña, guardar el usuario en la base de datos, devolver el usuario sin la contraseña
 */
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

/*
 * Login: validar email y contraseña, generar access token y refresh token, guardar el refresh token en redis con un TTL, devolver ambos tokens
 */

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

/**
 * Olvide mi contraseña: validar el email, generar un codigo de recuperacion, guardarlo en redis con un TTL, enviar el codigo por correo
 */

export const forgotPasswordController = async (req: Request, res: Response) => {
  const { email }: ForgotPasswordDto = req.body;

  const validation = forgotPasswordSchema.safeParse({ email });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.flatten() });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ip = req.ip ?? "unknown"; // fallback por si no se puede obtener la IP

  const rateKey = buildForgotRateKey(normalizedEmail, ip);
  const { allowed, attempts, ttl, retryAfter } = await rateLimit({
    redis: redisClient,
    key: rateKey,
    windowSeconds: FORGOT_RATE_LIMIT_WINDOW_SECONDS,
    max: FORGOT_RATE_LIMIT_MAX,
  });

  console.log("FORGOT_RATE_DEBUG", {
    ip,
    rateKey,
    allowed,
    attempts,
    ttl,
    retryAfter,
  });

  if (!allowed) {
    const retrySeconds = retryAfter ?? ttl;
    res.setHeader("Retry-After", String(retrySeconds));

    return res.status(429).json({
      error: "Demasiadas solicitudes, intenta mas tarde",
      retryAfter: retrySeconds,
    });
  }

  try {
    await forgotPasswordService(normalizedEmail);
    return res
      .status(200)
      .json({ message: "Instrucciones de recuperación enviadas" });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};

/*
 * Resetear contraseña: validar el email, codigo y nueva contraseña, validar el codigo, actualizar la contraseña
 */

export const resetPasswordController = async (req: Request, res: Response) => {
  const { email, code, newPassword }: ResetPasswordDto = req.body;

  const validation = resetPasswordSchema.safeParse({
    email,
    code,
    newPassword,
  });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.flatten() });
  }

  try {
    await resetPasswordService(email, code, newPassword);
    return res
      .status(200)
      .json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "INVALID_RESET_CODE") {
        return res
          .status(400)
          .json({ error: "Código de recuperación inválido o expirado" });
      }
    }
    return res.status(500).json({ error: "Error interno" });
  }
};
