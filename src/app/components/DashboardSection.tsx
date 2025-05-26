// src/app/components/DashboardSection.tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Party   { id: string; name: string; }
interface Policy  { id: string; name: string; total_budget: number; }
interface Campaign{ id: string; name: string; allocated_budget: number; }

export default function DashboardSection() {
  // รายชื่อพรรค dropdown
  const [allParties, setAllParties] = useState<Party[]>([]);
  // เมตริกซ์ตัวเลข
  const [policyCount, setPolicyCount]     = useState<number>(0);
  const [campaignCount, setCampaignCount] = useState<number>(0);
  // Dashboard data ตาม selected
  const [selected, setSelected]           = useState<string>("all");
  const [topPolicy, setTopPolicy]         = useState<Policy | null>(null);
  const [sumAllocated, setSumAllocated]   = useState<number>(0);
  const [netBudget, setNetBudget]         = useState<number>(0);
  const [top3, setTop3]                   = useState<Campaign[]>([]);

  // หา label ชื่อพรรค
 const ALL_LABEL = "ร่วมรัฐบาล";
 const partyLabel = selected === "all"
   ? ALL_LABEL
   // แก้ตรงนี้: cast id เป็น string เวลาหาร
   : allParties.find(p => String(p.id) === selected)?.name || "";

  // 1) fetch รายชื่อพรรคครั้งแรก
  useEffect(() => {
    fetch("/api/dashboard")             // ดึงรายชื่อพรรคจาก endpoint เดียวกับ metrics
      .then(r => r.json())
      .then(data => {
        setAllParties(data.parties || []);
        // ในกรณีแรก ให้ preload metrics แบบรวม
        setPolicyCount(data.policyCount);
        setCampaignCount(data.campaignCount);
        setTopPolicy(data.topPolicy);
        setSumAllocated(data.sumAllocated ?? 0);
        setNetBudget(data.netBudget ?? 0);
        setTop3(data.top3 || []);
      });
  }, []);

  // 2) fetch dashboard ทุกครั้งที่ selected เปลี่ยน
  useEffect(() => {
    const query = selected === "all" ? "" : `?partyId=${selected}`;
    fetch(`/api/dashboard${query}`)
      .then(r => r.json())
      .then(data => {
        setPolicyCount(data.policyCount);
        setCampaignCount(data.campaignCount);
        setTopPolicy(data.topPolicy);
        setSumAllocated(data.sumAllocated ?? 0);
        setNetBudget(data.netBudget ?? 0);
        setTop3(data.top3 || []);
      });
  }, [selected]);

  return (
    <section className="example-container p-6 mb-6">
      {/* Filter */}
      <div className="flex justify-end mb-4">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded shadow"
        >
          <option value="all">ร่วมรัฐบาล</option>
          {allParties.map((p, i) => (
            <option key={`${p.id}-${i}`} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* ชื่อพรรค */}
      <h2 className="text-6xl font-bold text-center text-white">พรรค</h2>
      <h2 className="text-6xl font-bold text-center text-white">{partyLabel}</h2>

      {/* นโยบายทั้งหมด / โครงการทั้งหมด */}
      <div className="mx-auto w-fit bg-blue-200 bg-opacity-20 rounded-2xl px-12 py-8 flex items-center mt-10 mb-10">
        {/* นโยบาย */}
        <div className="text-center text-white">
          <p className="text-6xl font-bold">{policyCount}</p>
          <p className="text-3xl mt-1">นโยบาย</p>
        </div>

        {/* เส้นคั่น */}
        <div className="mx-8 h-10 w-[1px] bg-white bg-opacity-30" />

        {/* โครงการ */}
        <div className="text-center text-white">
          <p className="text-6xl font-bold">{campaignCount}</p>
          <p className="text-3xl mt-1">โครงการ</p>
        </div>
      </div>

      {/* ปุ่มดูนโยบายทั้งหมด */}
      <div className="text-center mb-6">
        <Link href="/policycategory">
          <button className="bg-[#359FCF] hover:bg-[#2c8bbf] text-white px-6 py-3 rounded">
            ดูนโยบายทั้งหมด
          </button>
        </Link>
      </div>

      {/* การ์ด 3 ใบ */}
      <div className="grid grid-cols-3 gap-4">
        {/* 1 */}
        <div className="p-4 bg-[#e0f7fa] rounded-lg text-center">
          <h3 className="font-semibold">นโยบายที่มีงบมากที่สุด</h3>
          <p className="text-2xl mt-2">{topPolicy?.name || "-"}</p>
          <h3 className="font-semibold mt-4">มูลค่า</h3>
          <p className="mt-1 text-2xl">
            {topPolicy
              ? topPolicy.total_budget.toLocaleString("th-TH")
              : "-"} บาท
          </p>
        </div>

        {/* 2 */}
        <div className="p-4 bg-[#f1f8e9] rounded-lg text-center">
          <h3 className="font-semibold">งบโครงการทั้งหมด</h3>
          <p className="text-2xl mt-2">
            {sumAllocated.toLocaleString("th-TH")} บาท
          </p>
          <h3 className="font-semibold mt-4">คงเหลือ</h3>
          <p className="text-2xl mt-2">
            {netBudget.toLocaleString("th-TH")} บาท
          </p>
        </div>

        {/* 3 */}
        <div className="p-4 bg-[#fff3e0] rounded-lg">
          <h3 className="font-semibold text-center mb-2">
            โครงการงบสูงสุด 3 อันดับแรก
          </h3>
          <ul className="mt-4 space-y-2">
            {top3.map((c, i) => (
              <li key={`${c.id}-${i}`} className="flex items-center space-x-3">
                {/* badge เลข */}
                <div className="w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full text-sm font-medium">
                  {i + 1}
                </div>
                {/* ชื่อ + งบ */}
                <div className="flex-1 flex justify-between">
                  <span className="truncate">{c.name}</span>
                  <span>{c.allocated_budget.toLocaleString("th-TH")} บาท</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}