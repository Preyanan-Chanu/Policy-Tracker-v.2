import { NextResponse } from "next/server";
import pg from "@/app/lib/postgres";

export async function GET() {
  const client = await pg.connect();

  try {
    const result = await client.query("SELECT id, name FROM parties ORDER BY id");
    return NextResponse.json({ parties: result.rows });
  } catch (err) {
    console.error("❌ Failed to fetch parties:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  } finally {
    client.release();
  }
}
