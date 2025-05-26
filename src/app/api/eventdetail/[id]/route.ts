import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }

) {
  const { id } = await context.params;
const decodedId = parseInt(decodeURIComponent(id), 10);

  const session = driver.session();
  try {
    const result = await session.run(
  `
  MATCH (e:Event {id: $id})
  OPTIONAL MATCH (e)-[:LOCATED_IN]->(p:Province)
  OPTIONAL MATCH (e)-[:ORGANIZED_BY]->(party:Party)
  OPTIONAL MATCH (e)-[:RELATED_POLICY]->(po:Policy)
  RETURN e.id AS id,
         e.name AS name,
         e.description AS description,
         e.date AS date,
         e.time AS time,
         e.location AS location,
         e.map AS map,
         e.status AS status,
         p.name AS province,
         party.name AS party,
         po.name AS relatedPolicyName,
         po.description AS relatedPolicyDescription,
         po.id AS relatedPolicyId
  `,
  { id: decodedId }
);

    if (result.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบกิจกรรม" }, { status: 404 });
    }

    const record = result.records[0];
    const data = {
      id: record.get("id")?.toNumber?.() ?? null,
      name: record.get("name"),
      description: record.get("description"),
      date: record.get("date"),
      time: record.get("time"),
      location: record.get("location"),
      map: record.get("map"),
      status: record.get("status"),
      province: record.get("province"),
      party: record.get("party"),
      relatedPolicy: record.get("relatedPolicyName")
  ? {
      id: record.get("relatedPolicyId")?.toNumber?.() ?? null,
      name: record.get("relatedPolicyName"),
      description: record.get("relatedPolicyDescription"),
    }
  : null,

    };
console.log("🔗 relatedPolicyId", record.get("relatedPolicyId"));

    return NextResponse.json(data);
  } catch (err) {
    console.error("Neo4j error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}
