import bcrypt from "bcryptjs";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { createUser, findUserByEmail } from "./auth.repository";
import { AuthError } from "./utils/auth.errors";
import { sanitizeUser } from "./utils/auth.utils";
import { signAccessToken, signRefreshToken } from "./utils/jwt.utils";
import redisClient from "../../config/redis";


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
