import jwt from "jsonwebtoken";

export const signAccessToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: "5m" });

export const signRefreshToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
