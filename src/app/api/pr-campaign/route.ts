import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

export async function POST(req: NextRequest) {
  const { partyName } = await req.json();
  console.log("✅ partyName ที่รับจาก frontend:", partyName);
  if (!partyName)
    return NextResponse.json({ error: "Missing partyName" }, { status: 400 });

  const cleanedName = partyName.replace(/^พรรค\s*/gi, "").trim();
  const session = driver.session();

  try {
    // ✅ 1. ดึงจาก Neo4j ทั้ง Campaign และ SpecialCampaign
    const neoResult = await session.run(
      `
      MATCH (c)
      WHERE (c:Campaign OR c:SpecialCampaign)
      MATCH (c)-[:CREATED_BY]->(party:Party {name: $partyName})
      OPTIONAL MATCH (c)-[:PART_OF]->(p:Policy)
      RETURN 
        c.id AS id,
        c.name AS name,
        c.description AS description,
        c.progress AS progress,
        c.status AS status,
        labels(c) AS labels,
        p.name AS policy,
        c.area AS area,
        c.impact AS impact,
        c.size AS size
      `,
      { partyName: cleanedName }
    );

    const neoCampaigns = neoResult.records.map((r) => {
      const rawId = r.get("id");
      const rawProgress = r.get("progress");
      const labels: string[] = r.get("labels") || [];
      const isSpecial = labels.includes("SpecialCampaign");

      return {
        id: typeof rawId?.toNumber === "function" ? rawId.toNumber() : null,
        name: r.get("name"),
        description: r.get("description") || "-",
        progress: typeof rawProgress?.toNumber === "function" ? rawProgress.toNumber() : rawProgress ?? 0,
        policy: isSpecial ? "โครงการพิเศษ" : r.get("policy") || "-",
        status: r.get("status") || "-",
        area: r.get("area") || "-",
        impact: r.get("impact") || "-",
        size: r.get("size") || "-",
        isSpecial,
      };
    });
          console.log("✅ neoCampaigns ที่ได้จาก Neo4j:", neoCampaigns);

    // ✅ 2. ดึง budget และ created_at จาก PostgreSQL สำหรับโครงการทั่วไปเท่านั้น
    const validIds = neoCampaigns
      .map((c) => c.id)
      .filter((id): id is number => typeof id === "number" && id <= 2147483647);

    let pgCampaigns: Record<number, any> = {};
    if (validIds.length > 0) {
      const pgResult = await pg.query(
        `SELECT id, allocated_budget, created_at FROM campaigns WHERE id = ANY($1::int[])`,
        [validIds]
        
      );
        console.log("✅ ข้อมูล validIds ที่ส่งไป query PostgreSQL:", validIds);
        console.log("✅ ผลลัพธ์ที่ได้จาก PostgreSQL:", pgResult.rows);

      pgCampaigns = pgResult.rows.reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {} as Record<number, any>);
    }

    // ✅ 3. รวมข้อมูล
    const combined = neoCampaigns
      .filter((c) => c.id !== null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        progress: c.progress,
        policy: c.policy,
        status: c.status,
        budget: pgCampaigns[c.id!]?.allocated_budget ?? "-",

        created_at: pgCampaigns[c.id!]?.created_at ?? null,
        area: c.area,
        impact: c.impact,
        size: c.size,
        isSpecial: c.isSpecial,
      }));
      console.log("✅ ข้อมูลสุดท้ายที่ส่งกลับไป frontend:", combined);

    return NextResponse.json(combined);
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function GET() {
  return NextResponse.json({ message: "This API expects a POST request." });
}
