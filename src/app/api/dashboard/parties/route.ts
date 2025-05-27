// ✅ API: /api/dashboard/parties (เฉพาะดึงรายชื่อพรรคทั้งหมด)
// src/app/api/dashboard/parties/route.ts
import { NextResponse } from "next/server";
import pg from "@/app/lib/postgres";

export async function GET() {
  const client = await pg.connect();
  try {
    const res = await client.query("SELECT id, name FROM parties ORDER BY id ASC");
    return NextResponse.json({ parties: res.rows });
  } catch (err) {
    console.error("Error loading parties:", err);
    return NextResponse.json({ parties: [] });
  } finally {
    client.release();
  }
}