// /src/app/api/home/progress/route.ts
import { NextResponse } from "next/server";
import driver from "@/app/lib/neo4j";

const sizeWeight: Record<string, number> = {
    "เล็ก": 1,
    "กลาง": 2,
    "ใหญ่": 3,
};



function weightedProjectProgress(projects: { progress: number; size: string }[]) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const project of projects) {
        const w = sizeWeight[project.size] || 1;
        weightedSum += project.progress * w;
        totalWeight += w;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export async function GET() {
    const session = driver.session();

    try {
        const result = await session.run(`
      MATCH (c:Category)<-[:HAS_CATEGORY]-(p:Policy)-[:BELONGS_TO]->(party:Party)
      OPTIONAL MATCH (p)<-[:PART_OF]-(proj:Campaign)
      RETURN 
        c.name AS categoryName,
        p.name AS policyName,
        p.id AS policyId,
        p.status AS status,
        party.name AS partyName,
        party.id AS partyId, 
        collect({ progress: proj.progress, size: proj.size }) AS projects
      ORDER BY c.name
    `);

        // จัดกลุ่มตาม category
        const categoryMap = new Map();

        for (const record of result.records) {
            const categoryName = record.get("categoryName");
            const policyName = record.get("policyName");
            const policyId = record.get("policyId").toNumber();
            const status = record.get("status");
            const partyName = record.get("partyName");
            const partyId = record.get("partyId")?.toNumber?.() ?? null;
            const projects = record.get("projects");

            const policyProgress = weightedProjectProgress(projects);

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, []);
            }

            categoryMap.get(categoryName).push({
                id: policyId,
                name: policyName,
                status,
                partyName,
                partyId,
                progress: policyProgress,
            });
        }

        // เตรียม output
        const categories = Array.from(categoryMap.entries()).map(
            ([categoryName, policies]) => {
                const totalProgress = policies.reduce(
                    (sum: number, p: { progress: number }) => sum + p.progress,
                    0
                );

                const averageProgress =
                    policies.length > 0 ? totalProgress / policies.length : 0;

                return {
                    categoryName,
                    averageProgress,
                    policies,
                };
            }
        );

        return NextResponse.json(categories);
    } catch (err) {
        console.error("❌ Error in /api/home/progress:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await session.close();
    }
}
