import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

// Map ชื่อพรรค → ID ที่ใช้ใน URL ของ กกต.
const partyMap: Record<string, number> = {
  "ประชากรไทย": 2,
  "ความหวังใหม่": 3,
  "ก้าวไกล": 10,
  "ประชาธิปัตย์": 1,
  "ภูมิใจไทย": 15,
  "ชาติพัฒนา": 10,
  "เพื่อไทย": 8,
  "ประชารัฐ": 1,
  "ประชาชน": 32,
  "พลังประชาธิปไตย": 44,
  
  // เพิ่มได้ตามต้องการ
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const partyName = url.searchParams.get("party");

  if (!partyName || !partyMap[partyName]) {
    return NextResponse.json({ error: "กรุณาระบุชื่อพรรคที่ถูกต้องใน query เช่น ?party=เพื่อไทย" }, { status: 400 });
  }

  const partyId = partyMap[partyName];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(`https://party.ect.go.th/dataparty-detail/${partyId}`, {
      waitUntil: "networkidle2",
    });

    const members = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll(".table tr"))
    .slice(1) // ข้าม header
    .filter(row => row.querySelectorAll("td").length >= 3); // ✅ เฉพาะแถวที่มีข้อมูลครบ

  return rows.map(row => {
    const cols = row.querySelectorAll("td");
    return {
      name: cols[1]?.innerText.trim() || "",
      role: cols[4]?.innerText.trim() || "",
      image: cols[0]?.querySelector("img")?.getAttribute("src") || "",
    };
  });
});

    await browser.close();

    return NextResponse.json({ party: partyName, members });
  } catch (error) {
    console.error("❌ Scraping failed:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลสมาชิกพรรคได้" }, { status: 500 });
  }
}
