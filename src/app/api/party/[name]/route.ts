// ✅ /app/api/party/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import driver from '@/app/lib/neo4j';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params; // ✅ ต้อง await
  const decodedName = decodeURIComponent(name);



  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (p:Party {name: $name})
      RETURN p {
        .name, .description, .link, .logo
      } AS party
      `,
      { name }
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

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  const session = driver.session();
  const { name } = params;

  try {
    const { description, link, logo } = await req.json();

    await session.run(
      `
      MERGE (p:Party {name: $name})
      SET p.description = $description,
          p.link = $link,
          p.logo = $logo
      `,
      { name: decodeURIComponent(name), description, link, logo }
    );

    return NextResponse.json({ message: "Saved successfully" });
  } catch (err) {
    console.error("Neo4j Error:", err);
    return NextResponse.json({ error: "Failed to save party" }, { status: 500 });
  } finally {
    await session.close();
  }
}