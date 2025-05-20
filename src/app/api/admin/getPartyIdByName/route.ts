import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Party {name: $name}) RETURN p.id AS id`,
      { name }
    );
    const id = result.records[0]?.get("id")?.toNumber?.() || null;
    return NextResponse.json({ partyId: id }); 
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch id" }, { status: 500 });
  } finally {
    await session.close();
  }
}
