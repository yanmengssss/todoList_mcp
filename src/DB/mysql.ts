import { PrismaClient } from "../prisma-mysql-client/index.js";
// npx prisma generate --schema=./src/prisma-mysql/schema.prisma
// @ts-ignore
const globalForPrisma = global as unknown as { prismaMySQL?: PrismaClient };

export const prisma =
    globalForPrisma.prismaMySQL ||
    new PrismaClient({
        log: ["query", "error", "warn"], // 可选：调试时查看 SQL
    });
globalForPrisma.prismaMySQL = prisma;
