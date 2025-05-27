// ✅ /app/api/party/[id]/route.ts → เปลี่ยน path ด้วยให้เป็น [id]
import { NextRequest, NextResponse } from 'next/server';
import driver from '@/app/lib/neo4j';

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
      MATCH (p:Party {id: $id})
      RETURN p { .id, .name, .description, .link, } AS party
      `,
      { id: decodedId }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result.records[0].get("party"));
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch party" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = driver.session();
  const id = parseInt(decodeURIComponent(params.id), 10);

  try {
    const { name, description, link, logo } = await req.json();

    await session.run(
      `
      MERGE (p:Party {id: $id})
      SET p.name = $name,
          p.description = $description,
          p.link = $link,
      
      `,
      { id, name, description, link, logo }
    );

    return NextResponse.json({ message: "Saved successfully" });
  } catch (err) {
    console.error("Neo4j Error:", err);
    return NextResponse.json({ error: "Failed to save party" }, { status: 500 });
  } finally {
    await session.close();
  }
}
