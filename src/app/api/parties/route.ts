// app/api/parties/route.ts
import { NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET() {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (p:Party)
      RETURN DISTINCT p.name AS name
      ORDER BY p.name
    `);
    const parties = result.records.map(r => r.get("name") as string);
    return NextResponse.json(parties);
  } catch (error) {
    console.error("Failed to fetch parties:", error);
    return NextResponse.json([], { status: 500 });
  } finally {
    await session.close();
  }
}
