// app/api/policy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import driver from '@/app/lib/neo4j';
import { Heart } from "lucide-react";

export async function GET(_req: NextRequest) {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Policy)-[:BELONGS_TO]->(party:Party)
            OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      RETURN p.name AS policyName, p.description AS description, 
             p.budget AS budget, p.progress AS progress, 
             party.name AS partyName, c.name AS categoryName
    `);

    const policies = result.records.map((record) => ({
      policyName: record.get("policyName"),
      description: record.get("description"),
      budget: record.get("budget")?.toNumber?.() ?? 0,
      progress: record.get("progress"),
      partyName: record.get("partyName"),
      categoryName: record.get("categoryName") || "-",
    }));

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Neo4j Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}
