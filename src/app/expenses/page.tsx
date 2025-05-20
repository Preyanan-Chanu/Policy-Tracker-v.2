"use client";
import { useState, useEffect } from "react";

export default function ExpenseForm() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("วัสดุอุปกรณ์");

  const categoryOptions = ["วัสดุอุปกรณ์", "ค่าเดินทาง", "ค่าอบรม", "ค่าโฆษณา", "อื่น ๆ"];

  useEffect(() => {
    fetch("/api/campaignsExpenses")
      .then((res) => res.json())
      .then((data) => setCampaigns(data))
      .catch((err) => console.error("โหลดโครงการล้มเหลว:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: Number(campaignId),
        description,
        amount: Number(amount),
        category,
      }),
    });
    const result = await res.json();
    if (res.ok) alert("✅ บันทึกสำเร็จ");
    else alert("❌ บันทึกล้มเหลว: " + result.error);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-[#5D5A88]">บันทึกค่าใช้จ่าย</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <div>
          <label className="block font-medium">โครงการ</label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value="">-- เลือกโครงการ --</option>
            {campaigns.map((c: { id: number; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">รายละเอียด</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">จำนวนเงิน</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">หมวดหมู่</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
          >
            {categoryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="bg-[#5D5A88] text-white px-4 py-2 rounded hover:bg-[#46426b]">
          บันทึก
        </button>
      </form>
    </div>
  );
}
