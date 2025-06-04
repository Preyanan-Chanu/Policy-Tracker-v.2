import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

// สร้าง pool ใหม่ถ้ายังไม่มี
const pool =
  global._pgPool ||
  new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

// เก็บ pool ไว้ใน global สำหรับ reuse
if (!global._pgPool) {
  global._pgPool = pool;
}

export default pool;
