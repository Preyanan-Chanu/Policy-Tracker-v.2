// src/app/api/dashboard/route.ts
import { NextResponse, NextRequest  } from "next/server";
import pg from "@/app/lib/postgres";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const partyId = url.searchParams.get("partyId") || "all";
  const client = await pg.connect();

  try {
    // นับ policies
    const polRes = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM policies
      ${partyId === "all" ? "" : "WHERE party_id = $1"}
    `, partyId === "all" ? [] : [partyId]);
    const policyCount = Number(polRes.rows[0].cnt);

    // นับ campaigns
    const campRes = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM campaigns
      ${partyId === "all" ? "" : "WHERE party_id = $1"}
    `, partyId === "all" ? [] : [partyId]);
    const campaignCount = Number(campRes.rows[0].cnt);

    // ดึง list พรรคทั้งหมด (หรือกรองตาม partyId ถ้าไม่ใช่ all)
    const partiesRes = await client.query(`
      SELECT id, name
      FROM parties
      ${partyId === "all" ? "" : "WHERE id = $1"}
    `, partyId === "all" ? [] : [partyId]);
    const parties = partiesRes.rows;

    // Policy ที่งบสูงสุด
    const topPolicyRes = await client.query(`
      SELECT id, name, total_budget
      FROM policies
      ${partyId === "all" ? "" : "WHERE party_id = $1"}
      ORDER BY total_budget DESC
      LIMIT 1
    `, partyId === "all" ? [] : [partyId]);
    const topPolicy = topPolicyRes.rows[0] || null;

    // คำนวณ sumAllocated และ sumExpense เพื่อหา netBudget
    const sumRes = await client.query(`
      SELECT
        COALESCE(SUM(c.allocated_budget),0) AS sum_allocated,
        COALESCE(SUM(e.amount),0) AS sum_expense
      FROM campaigns c
      LEFT JOIN expenses e ON e.campaign_id = c.id
      ${partyId === "all" ? "" : "WHERE c.party_id = $1"}
    `, partyId === "all" ? [] : [partyId]);
    const { sum_allocated, sum_expense } = sumRes.rows[0];
    const sumAllocated = Number(sum_allocated);
    const netBudget = sumAllocated - Number(sum_expense);

    // Top 3 campaigns
    const top3Res = await client.query(`
      SELECT id, name, allocated_budget
      FROM campaigns
      ${partyId === "all" ? "" : "WHERE party_id = $1"}
      ORDER BY allocated_budget DESC
      LIMIT 3
    `, partyId === "all" ? [] : [partyId]);
    const top3 = top3Res.rows;

    

    // คืนค่าให้หน้าบ้าน
    return NextResponse.json({
      policyCount,
      campaignCount,
      parties,         // <-- คืนค่าที่ดึงมาแทน []
      topPolicy,
      sumAllocated,    // ชื่อตรงกับ setSumAllocated
      netBudget,
      top3,
    });
  } finally {
    client.release();
  }
}