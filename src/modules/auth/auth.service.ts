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
import { randomInt } from "crypto";

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
  const normalizedEmail = email.trim().toLowerCase();
  const existingUserByEmail = await findUserByEmail(normalizedEmail);
  if (existingUserByEmail) {
    throw new AuthError("EMAIL_EXISTS");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await createUser({
    email: normalizedEmail,
    name,
    password: hashedPassword,
  });

  return sanitizeUser(newUser);
};

/*
 * Login: validar email y contraseña, generar access token y refresh token, guardar el refresh token en redis con un TTL, devolver ambos tokens
 */

export const loginService = async ({ email, password }: LoginDto) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
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

const generateCode = () => randomInt(100000, 999999).toString();

export const forgotPasswordService = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  // Respuesta generica: si no existe, no hacemos nada
  if (!user) return;

  const codeKey = `reset:${normalizedEmail}`;
  const code = generateCode();

  // 1. Emulamos el comportamiento "NX": verificamos si ya existe el código
  const exists = await redisClient.exists(codeKey);
  if (exists) {
    console.log(
      `[FORGOT] Ya existe un código de recuperación activo para ${normalizedEmail}`,
    );
    return; // Si existe, salimos silenciosamente para no sobrescribir el código anterior
  }

 // 2. Guardamos usando setEx (método directo y compatible)
  await redisClient.setEx(codeKey, RESET_TTL_SECONDS, code);
  // await redisClient.set(codeKey, code);

  console.log("--- DEBUG: FORGOT PASSWORD (NUEVO MÉTODO) ---");
  console.log(`Email normalizado: "${normalizedEmail}"`);
  console.log(`Clave guardada en Redis: "${codeKey}"`);
  console.log(`Código generado y guardado: "${code}"`);
  console.log("---------------------------------------------");

/*   if (!wasSet) {
    console.log(
      `[FORGOT] No se guardó el nuevo código porque ya existe uno activo para ${normalizedEmail}`,
    );
    return;
  } */

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
  const resetKey = `reset:${normalizedEmail}`;
  const storedCode = await redisClient.get(resetKey);

  console.log("--- DEBUG: RESET PASSWORD ---");
  console.log(`Email normalizado recibido: "${normalizedEmail}"`);
  console.log(`Clave buscada en Redis: "${resetKey}"`);
  console.log(
    `Código recibido en la petición: "${normalizedCode}" (Tipo: ${typeof normalizedCode}, Largo: ${normalizedCode.length})`,
  );
  console.log(
    `Código recuperado de Redis: "${storedCode}" (Tipo: ${typeof storedCode}, Largo: ${storedCode?.length ?? 0})`,
  );
  console.log(`¿Coinciden los códigos?: ${storedCode === normalizedCode}`);
  console.log("-----------------------------");

  if (!storedCode || storedCode !== normalizedCode) {
    throw new AuthError("INVALID_RESET_CODE");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordByEmail(normalizedEmail, hashedPassword);

  await redisClient.del(`reset:${normalizedEmail}`);
};
