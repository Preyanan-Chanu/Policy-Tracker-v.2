// src/app/api/campaigndetail/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import driver from '@/app/lib/neo4j'
import { storage } from '@/app/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'
import pg from '@/app/lib/postgres'

export async function GET(
  req: NextRequest,
  context: { params: { name?: string } }
) {
  const { name } = await context.params
  if (!name) {
    return NextResponse.json({ error: 'Missing name param' }, { status: 400 })
  }

  const session = driver.session()
  try {
    const result = await session.run(
      `
      // 1) เริ่มจากดึง Campaign หลักและ Policy ที่มันสังกัด
      MATCH (c:Campaign { name: $name })-[:PART_OF]->(p:Policy)

      // 2) หา Campaign อื่น ๆ ใน Policy เดียวกัน ยกเว้นตัวเอง
      OPTIONAL MATCH (p)<-[:PART_OF]-(other:Campaign)
        WHERE other.name <> $name

      // ส่งต่อ c, p และรวบรวม relatedProjects
      WITH c, p, collect({ name: other.name, description: other.description }) AS relatedProjects

      // 3) หา Party ที่ Policy นี้สังกัด (อาจไม่มี)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(party:Party)
      WITH c, p, relatedProjects, head(collect(party)) AS partyNode

      // 4) หา Event ที่ BELONGS_TO นโยบายนี้
      OPTIONAL MATCH (e:Event)-[:BELONGS_TO]->(p)
      WITH c, p, relatedProjects, partyNode,
           collect({ name: e.name, description: e.description }) AS relatedEvents

      // 5) คืนผลเป็น object เดียว
      RETURN {
        id:             c.id,
        name:            c.name,
        description:     c.description,
        status:          c.status,
        relatedProjects: relatedProjects,
        policy: {
          name:        p.name,
          description: p.description,
          status:      p.status
        },
        party: CASE WHEN partyNode IS NULL THEN null ELSE {
          name:        partyNode.name,
          description: partyNode.description,
          link:        partyNode.link
        } END,
        relatedEvents: relatedEvents
      } AS campaign
      `,
      { name }
    )

    if (result.records.length === 0) {
      return NextResponse.json({ error: `ไม่พบข้อมูลโครงการ: ${name}` }, { status: 404 })
    }

    const campaign = result.records[0].get('campaign')

    // 6) ดึง banner จาก Firebase Storage
    let bannerUrl: string | null = null
    for (const ext of ['jpg', 'png'] as const) {
      try {
        bannerUrl = await getDownloadURL(
          ref(storage, `campaign/banner/${name}.${ext}`)
        )
        break
      } catch {
        // ถ้าไม่เจอไฟล์ชนิดนี้ก็ข้ามไป
      }
    }

    const client = await pg.connect()
try {
  const pgResult = await client.query(
    `SELECT allocated_budget FROM campaigns WHERE name = $1`,
    [name]
  )

  const expenseResult = await client.query(
    `SELECT description, amount FROM expenses WHERE campaign_id = (
       SELECT id FROM campaigns WHERE name = $1
     )`,
    [name]
  )

  const budget = pgResult.rows[0]?.allocated_budget || 0
  const expenses = expenseResult.rows || []

  return NextResponse.json({
    ...campaign,
    banner: bannerUrl,
    budget,
    expenses
  })
} finally {
  client.release()
}

  } catch (error: any) {
    console.error('Neo4j Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await session.close()
  }
}
