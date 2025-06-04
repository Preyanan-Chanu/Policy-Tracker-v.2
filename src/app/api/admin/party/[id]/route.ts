// src/app/api/admin/party/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";
import pool from "@/app/lib/postgres";
import neo4j from "neo4j-driver";

// ─── GET: ดึงพรรคตาม id ───────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Party {id: $id})
       RETURN p.id AS id, p.name AS name, p.description AS description, p.link AS link`,
      { id: neo4j.int(id) }
    );
    

    if (result.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบพรรค" }, { status: 404 });
    }
    const rec = result.records[0];
    const party = {
      id: rec.get("id").toNumber(),
      name: rec.get("name"),
      description: rec.get("description"),
      link: rec.get("link"),
    };
    return NextResponse.json(party);
  } catch (err: any) {
    console.error("❌ /api/admin/party/[id] GET error:", err);
    return NextResponse.json({ error: (err as any).message ?? "อัปเดตไม่สำเร็จ" }, { status: 500 });
  } finally {
    await session.close();
  }
}

 // ─── PUT: อัปเดตพรรคตาม id ────────────────────
 export async function PUT(
   request: NextRequest,
   context: { params: { id: string } }
 ) {
   // 1) รอ resolve params.id
   const { id: idStr } = await context.params;
   const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }
  const { name, description, link } = await request.json();

  // อัปเดตใน Postgres
  const pgClient = await pool.connect();
  const neoSession = driver.session();
  try {
    await pgClient.query(
      `UPDATE parties 
         SET name = $1      
       WHERE id = $2`,
      [ name.trim(), id ]
    );
    // อัปเดตใน Neo4j
    await neoSession.run(
      `MATCH (p:Party {id: $id})
       SET p.name = $name,
           p.description = $description,
           p.link = $link`,
      {
        id: neo4j.int(id),
        name,
        description: description || "",
        link: link || "",
      }
    );

    return NextResponse.json({ success: true });
  } 
  catch (err: unknown) {
    console.error("❌ /api/admin/party/[id] PUT error:", err);
// ส่ง message จาก exception จริงๆ กลับไป
  const message = err instanceof Error ? err.message : String(err);
   return NextResponse.json(
      { error: message },
      { status: 500 }
    );
   } finally {
     // ปิด connection แบบปลอดภัย
   try { pgClient.release(); } catch (e) { console.error(e); }
   try { await neoSession.close(); } catch (e) { console.error(e); }
  }
}

// ─── DELETE: ลบพรรคตาม id (ถ้าต้องการ) ─────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
  }

  const pgClient = await pool.connect();
  const neoSession = driver.session();
  try {
    // ลบจาก Postgres
    await pgClient.query(`DELETE FROM parties WHERE id = $1`, [id]);
    // ลบจาก Neo4j
    await neoSession.run(
      `MATCH (p:Party {id: $id}) DETACH DELETE p`,
      { id: neo4j.int(id) }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ /api/admin/party/[id] DELETE error:", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  } finally {
    pgClient.release();
    await neoSession.close();
  }
}
