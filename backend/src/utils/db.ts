import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// Extract clean filepath from process.env.DATABASE_URL
// e.g. "file:./dev.db" -> "./dev.db"
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbPath = dbUrl.startsWith("file:") ? dbUrl.replace("file:", "") : dbUrl;

// Resolve path relative to project root
const absoluteDbPath = path.resolve(__dirname, "../../", dbPath);

// Instantiate adapter by passing the url option object directly
const adapter = new PrismaBetterSqlite3({
  url: `file:${absoluteDbPath}`,
});

export const prisma = new PrismaClient({ adapter });
