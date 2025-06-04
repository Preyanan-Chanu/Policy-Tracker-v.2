import neo4j, { Driver } from "neo4j-driver";

declare global {
  var _neo4jDriver: Driver | undefined;
}



// ตรวจสอบ environment variables
if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
  throw new Error("❌ Missing Neo4j environment variables");
}

// สร้าง driver เพียงครั้งเดียว
const driver =
  global._neo4jDriver ||
  neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );

// เก็บไว้ใน global เพื่อ reuse
if (!global._neo4jDriver) {
  global._neo4jDriver = driver;
}

export default driver;
