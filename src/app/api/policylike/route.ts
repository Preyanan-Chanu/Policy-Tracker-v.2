// app/api/policylike/route.ts
"use server";
import { NextResponse } from 'next/server';
import neo4j, { int, isInt } from 'neo4j-driver';
import driver from '@/app/lib/neo4j';

// GET /api/policylike?name=...
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing policy name' }, { status: 400 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
        MATCH (p:Policy { name: $name })
        RETURN p.like AS like
      `,
      { name }
    );

    let likeCount = 0;
    if (result.records.length > 0) {
      const raw = result.records[0].get('like');
      likeCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    }
    return NextResponse.json({ like: likeCount });
  } catch (error) {
    console.error('❌ GET /api/policylike error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    await session.close();
  }
}

// POST /api/policylike  { name: string, action: 'increment' | 'decrement' }
export async function POST(request: Request) {
  const body = await request.json();
  const { name, action } = body as { name?: string; action?: string };
  if (!name || !action || !['increment', 'decrement'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const session = driver.session();
  try {
    const delta = action === 'increment' ? 1 : -1;
    const result = await session.run(
      `
        MATCH (p:Policy { name: $name })
        SET p.like = coalesce(p.like, 0) + $delta
        RETURN p.like AS like
      `,
      { name, delta: int(delta) }
    );

    const raw = result.records[0].get('like');
    const newCount = isInt(raw) ? raw.toNumber() : (raw as number) || 0;
    return NextResponse.json({ like: newCount });
  } catch (error) {
    console.error('❌ POST /api/policylike error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    await session.close();
  }
}
