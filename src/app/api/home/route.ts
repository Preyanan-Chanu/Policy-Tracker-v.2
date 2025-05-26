import { NextResponse } from "next/server";
import driver from "@/app/lib/neo4j"; // ปรับ path ให้ตรงกับ driver ของคุณ

export async function GET() {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (c:Category)<-[:HAS_CATEGORY]-(p:Policy)-[:BELONGS_TO]->(party:Party)
      WITH c.name AS categoryName, 
      collect({
        id: toString(p.id), 
        name: p.name,
        description: p.description,
        partyName: party.name,   // ← ตรงนี้ต้องมี comma
        status: p.status         // ← ฟิลด์ใหม่
      }) AS policies
      RETURN categoryName, policies
      ORDER BY categoryName
      LIMIT 8
    `);

    const categories = result.records.map(record => ({
      name: record.get("categoryName"),
      policies: record.get("policies"),
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Neo4j query failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}