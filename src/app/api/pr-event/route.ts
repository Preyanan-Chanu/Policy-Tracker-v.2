import { NextRequest, NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

export async function POST(req: NextRequest) {
   const session = driver.session();
  try {
    const { partyName } = await req.json();
    if (!partyName) {
      return NextResponse.json({ error: "Missing partyName" }, { status: 400 });
    }

    const cleanedName = partyName.trim();
    

    const query = `
      MATCH (e:Event)-[:ORGANIZED_BY]->(p:Party {name: $partyName})
      RETURN e.id AS id, e.name AS event_name, e.description AS event_des,
       e.date AS event_date, e.time AS event_time, e.location AS event_location,
       e.map AS map, e.status AS status

    `;
    const result = await session.run(query, { partyName: cleanedName });

    const events = result.records
  .filter((record) => record.get("id")) // ป้องกัน record ไม่มี e.id
  .map((record) => ({
    id: record.get("id").toNumber(),
      event_name: record.get("event_name"),
      event_des: record.get("event_des"),
      event_date: record.get("event_date"),
      event_time: record.get("event_time"),
      event_location: record.get("event_location"),
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function GET() {
  return NextResponse.json({ message: "This API expects a POST request." });
}
