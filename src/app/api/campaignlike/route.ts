// src/app/api/campaigndetaillike/route.ts
"use server";
import { NextResponse } from "next/server";
import neo4j, { int, isInt } from "neo4j-driver";
import driver from "@/app/lib/neo4j";

// GET /api/campaigndetaillike?name=...
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing campaign name" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
        MATCH (c:Campaign { name: $name })
        RETURN c.like AS like
      `,
      { name }
    );

    let likeCount = 0;
    if (result.records.length > 0) {
      const raw = result.records[0].get("like");
      likeCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    }

    return NextResponse.json({ like: likeCount });
  } catch (error) {
    console.error("❌ GET /api/campaigndetaillike error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    await session.close();
  }
}

// POST /api/campaigndetaillike  { name: string, action: 'increment' | 'decrement' }
export async function POST(request: Request) {
  const body = await request.json();
  const { name, action } = body as { name?: string; action?: string };
  if (!name || !action || !["increment", "decrement"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = driver.session();
  try {
    const delta = action === "increment" ? 1 : -1;
    const result = await session.run(
      `
        MATCH (c:Campaign { name: $name })
        SET c.like = coalesce(c.like, 0) + $delta
        RETURN c.like AS like
      `,
      { name, delta: int(delta) }
    );

    const raw = result.records[0].get("like");
    const newCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    return NextResponse.json({ like: newCount });
  } catch (error) {
    console.error("❌ POST /api/campaigndetaillike error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    await session.close();
  }
}
