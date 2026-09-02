import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// DATABASE_URL is typically "file:./dev.db". Remove the "file:" prefix for better-sqlite3
const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db";
const adapter = new PrismaBetterSqlite3({ url: connectionString });

export const prisma = new PrismaClient({ adapter });
