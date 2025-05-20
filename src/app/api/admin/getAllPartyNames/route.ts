import { NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET() {
  const session = driver.session();
  try {
    const result = await session.run("MATCH (p:Party) RETURN p.name AS name ORDER BY name");
    const names = result.records.map((r) => r.get("name"));
    return NextResponse.json({ names });
  } catch (err) {
    console.error("❌ Error fetching parties:", err);
    return NextResponse.json({ error: "Failed to load party names" }, { status: 500 });
  } finally {
    await session.close();
  }
}
