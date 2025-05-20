import { NextResponse } from "next/server";
import pool from "@/app/lib/postgres"; // ตรวจให้แน่ใจว่าไฟล์นี้เชื่อมต่อ PostgreSQL ถูกต้อง

export async function GET() {
  try {
    const result = await pool.query("SELECT id, name FROM campaigns ORDER BY id");
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("❌ Load campaigns error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
