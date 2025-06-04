import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

// 🔹 GET: ดึงข้อมูลกิจกรรมตาม ID
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (e:Event {id: toInteger($id)})
      OPTIONAL MATCH (e)-[:LOCATED_IN]->(prov:Province)
      OPTIONAL MATCH (e)-[:RELATED_POLICY]->(po:Policy)
      OPTIONAL MATCH (e)-[:UNDER_CAMPAIGN]->(c:Campaign)
      RETURN e.name AS name, e.description AS description, e.date AS date, e.status AS status, 
             e.time AS time, e.location AS location, e.map AS map,
             prov.name AS province,
             po.name AS policy,
             c.name AS campaign
      `,
      { id: idNumber }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: "ไม่พบกิจกรรม" }, { status: 404 });
    }

    const r = result.records[0];
    return NextResponse.json({
      name: r.get("name"),
      description: r.get("description"),
      date: r.get("date"),
      time: r.get("time"),
      location: r.get("location"),
      map: r.get("map"),
      status: r.get("status") ?? null,
      province: r.get("province") ?? null,
      policy: r.get("policy") ?? null,
      campaign: r.get("campaign") ?? null,
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  } finally {
    await session.close();
  }
}

// 🔹 DELETE: ลบกิจกรรมตาม ID
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const session = driver.session();

  try {
    await session.run(
      `MATCH (e:Event {id: toInteger($id)}) DETACH DELETE e`,
      { id: idNumber }
    );

    return NextResponse.json({ message: "ลบกิจกรรมสำเร็จ" });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ error: "ลบกิจกรรมไม่สำเร็จ" }, { status: 500 });
  } finally {
    await session.close();
  }
}

// 🔹 PUT: อัปเดตกิจกรรมตาม ID
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const idNumber = parseInt(id);
  if (isNaN(idNumber)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const {
    name, description, date, time, location, map,
    policy, campaign, province, status
  } = await req.json();

  const session = driver.session();

  try {
    // 🔸 อัปเดต properties หลัก
    await session.run(
      `
      MATCH (e:Event {id: toInteger($id)})
      SET e.name = $name,
          e.description = $description,
          e.date = $date,
          e.time = $time,
          e.location = $location,
          e.map = $map,
          e.status = $status
      `,
      { id: idNumber, name, description, date, time, location, map, status }
    );

    // 🔸 ลบความสัมพันธ์เดิม
    await session.run(
      `
      MATCH (e:Event {id: toInteger($id)})
      OPTIONAL MATCH (e)-[r:RELATED_POLICY|UNDER_CAMPAIGN|LOCATED_IN]->()
      DELETE r
      `,
      { id: idNumber }
    );

    // 🔸 สร้างความสัมพันธ์ใหม่
    if (policy) {
  await session.run(
    `
    MATCH (e:Event {id: toInteger($id)})
    MATCH (p:Policy {name: $policy})
    MERGE (e)-[:RELATED_POLICY]->(p)
    `,
    { id: idNumber, policy }
  );
}

// ✅ ย้าย DELETE ออกมานอก if
await session.run(
  `
  MATCH (e:Event {id: toInteger($id)})-[r:UNDER_CAMPAIGN]->()
  DELETE r
  `,
  { id: idNumber }
);

if (campaign && campaign.trim() !== "") {
  await session.run(
    `
    MATCH (e:Event {id: toInteger($id)})
    MATCH (c:Campaign {name: $campaign})
    MERGE (e)-[:UNDER_CAMPAIGN]->(c)
    `,
    { id: idNumber, campaign }
  );
}

if (province) {
  await session.run(
    `
    MATCH (e:Event {id: toInteger($id)})
    MERGE (prov:Province {name: $province})
    MERGE (e)-[:LOCATED_IN]->(prov)
    `,
    { id: idNumber, province }
  );
}

    return NextResponse.json({ message: "แก้ไขกิจกรรมสำเร็จ" });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขกิจกรรมได้" }, { status: 500 });
  } finally {
    await session.close();
  }
}
