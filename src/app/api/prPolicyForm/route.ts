import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pg from "@/app/lib/postgres";

// ✅ POST: สร้างนโยบายใหม่
export async function POST(req: NextRequest) {
  const { name, description, banner, category, party, status } = await req.json(); // 👈 เพิ่ม status
  const session = driver.session();

  if (!party || party === "ไม่ทราบชื่อพรรค") {
    return NextResponse.json({ error: "ไม่พบข้อมูลพรรค" }, { status: 400 });
  }

  try {
    const cleanedParty = party.replace(/^พรรค\s*/g, "").trim();

    const partyResult = await pg.query(
      `SELECT id FROM parties WHERE name = $1`,
      [cleanedParty]
    );

    if (partyResult.rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบ party ใน PostgreSQL" }, { status: 404 });
    }

    const party_id = partyResult.rows[0].id;

    const duplicateCheck = await pg.query(
      `SELECT id FROM policies WHERE name = $1`,
      [name]
    );

    if ((duplicateCheck.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: "ชื่อนโยบายนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    }

    // ✅ เพิ่มใน PostgreSQL
    const result = await pg.query(
      `INSERT INTO policies (name, total_budget, created_at, party_id)
       VALUES ($1, 0, NOW(), $2)
       RETURNING id`,
      [name, party_id]
    );

    const id = result.rows[0].id;

    // ✅ เพิ่มใน Neo4j
    await session.run(
      `
      MERGE (p:Policy {id: toInteger($id)})
      SET p.name = $name,
          p.description = $description,
          p.banner = $banner,
          p.status = $status,       
          p.like = 0,
          p.progress = "0%"

      WITH p
      MERGE (cat:Category {name: $category})
      MERGE (p)-[:HAS_CATEGORY]->(cat)

      WITH p
      MATCH (pt:Party {name: $party})
      MERGE (p)-[:BELONGS_TO]->(pt)
      `,
      { id, name, description, banner, category, party: cleanedParty, status } 
    );

    return NextResponse.json({ message: "สร้างนโยบายสำเร็จ", id });
  } catch (err) {
    console.error("❌ POST error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }, { status: 500 });
  } finally {
    await session.close();
  }
}

// ✅ PUT: อัปเดตนโยบายเดิม
export async function PUT(req: NextRequest) {
  const { id, name, description, banner, category, status } = await req.json(); // 👈 เพิ่ม status
  const session = driver.session();

  if (!id) {
    return NextResponse.json({ error: "Missing policy ID" }, { status: 400 });
  }

  try {
    // ✅ อัปเดต Neo4j
    await session.run(
      `
      MATCH (p:Policy {id: toInteger($id)})
      SET p.name = $name,
          p.description = $description,
          p.banner = $banner,
          p.status = $status         // 👈 บันทึกสถานะใหม่
      `,
      { id, name, description, banner, status }
    );

    // ✅ ลบความสัมพันธ์เดิม
    await session.run(
      `
      MATCH (p:Policy {id: toInteger($id)})-[r:HAS_CATEGORY]->()
      DELETE r
      `,
      { id }
    );

    // ✅ สร้างความสัมพันธ์ใหม่
    await session.run(
      `
      MATCH (p:Policy {id: toInteger($id)})
      MERGE (c:Category {name: $category})
      MERGE (p)-[:HAS_CATEGORY]->(c)
      `,
      { id, category }
    );

    // ✅ อัปเดต PostgreSQL (หากมี field อื่นเพิ่มให้ทำที่นี่)
    await pg.query(
      `UPDATE policies SET name = $1 WHERE id = $2`,
      [name, id]
    );

    return NextResponse.json({ message: "แก้ไขนโยบายสำเร็จ" });
  } catch (err) {
    console.error("❌ PUT error:", err);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขนโยบายได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}
