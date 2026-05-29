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

