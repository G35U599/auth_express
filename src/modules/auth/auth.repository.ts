import { HashEncoding } from "./../../../node_modules/zod/src/v4/core/util";
import prisma from "../../config/db";

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (data: {
  email: string;
  name?: string;
  password: string;
}) => {
  return prisma.user.create({
    data,
  });
};

export const updateUserPasswordByEmail = async (
  email: string,
  hashedPassword: string,
) => {
  return prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });
};
