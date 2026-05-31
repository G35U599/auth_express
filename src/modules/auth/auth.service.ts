import bcrypt from "bcryptjs";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import {
  createUser,
  findUserByEmail,
  updateUserPasswordByEmail,
} from "./auth.repository";
import { AuthError } from "./utils/auth.errors";
import { sanitizeUser } from "./utils/auth.utils";
import { signAccessToken, signRefreshToken } from "./utils/jwt.utils";
import redisClient from "../../config/redis";
import { sendResetCode } from "./utils/mail.utils";

/**
 * Registro: validar que el email no exista, hashear la contraseña, guardar el usuario en la base de datos, devolver el usuario sin la contraseña
 * Login: validar email y contraseña, generar access token y refresh token, guardar el refresh token en redis con un TTL, devolver ambos tokens
 * Recuperar contraseña, generar un codigo de recuperacion, guardarlo en redis con un TTL, enviar el codigo por correo, validar el codigo y actualizar la contraseña
 **/

export const registerService = async ({
  email,
  name,
  password,
}: RegisterDto) => {
  const existingUserByEmail = await findUserByEmail(email);
  if (existingUserByEmail) {
    throw new AuthError("EMAIL_EXISTS");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await createUser({
    email,
    name,
    password: hashedPassword,
  });

  return sanitizeUser(newUser);
};

/*
 * Login: validar email y contraseña, generar access token y refresh token, guardar el refresh token en redis con un TTL, devolver ambos tokens
 */

export const loginService = async ({ email, password }: LoginDto) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthError("INVALID_CREDENTIALS");
  }
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);
  return {
    accessToken,
    refreshToken,
  };
};

/*
 * Recuperar contraseña, generar un codigo de recuperacion, guardarlo en redis con un TTL, enviar el codigo por correo, validar el codigo y actualizar la contraseña
 */

const RESET_TTL_SECONDS = 10 * 60; // 10 minutos

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const forgotPasswordService = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  // Respuesta generica: si no existe, no hacemos nada
  if (!user) return;

  const codeKey = `reset:${normalizedEmail}`;
  const code = generateCode();

  await redisClient.setEx(codeKey, RESET_TTL_SECONDS, code);

  await sendResetCode(normalizedEmail, code);
};

/**
 * Validar el codigo y actualizar la contraseña
 */

export const resetPasswordService = async (
  email: string,
  code: string,
  newPassword: string,
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  const storedCode = await redisClient.get(`reset:${normalizedEmail}`);
  const ttl = await redisClient.ttl(`reset:${normalizedEmail}`);

  console.log({
    normalizedEmail,
    normalizedCode,
    storedCode,
    ttl,
  });

  if (ttl < 0 || ttl > RESET_TTL_SECONDS) {
    throw new AuthError("INVALID_RESET_CODE");
  }

  if (!storedCode || storedCode !== normalizedCode) {
    throw new AuthError("INVALID_RESET_CODE");
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordByEmail(normalizedEmail, hashedPassword);

  await redisClient.del(`reset:${normalizedEmail}`);
};
