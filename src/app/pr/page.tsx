"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/app/components/PRSidebar";
import { useRouter } from "next/navigation";

export default function PRPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [partyName, setPartyName] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
  const role = localStorage.getItem("role");
  if (role !== "pr") {
    alert("❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    router.push("/login");
  }
}, []);


  // โหลด partyName จาก localStorage หลัง login
  useEffect(() => {
    const storedParty = localStorage.getItem("partyName");
    setPartyName(storedParty ?? "ไม่ทราบชื่อพรรค");
  }, []);

  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <Sidebar />

      <div className="flex-1 md:ml-64">
        {/* Navbar */}
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">
            PR พรรค {partyName}
          </h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-3xl text-[#5D5A88] focus:outline-none"
          >
            ☰
          </button>
          <ul className="hidden md:flex space-x-4">
            <li>
              <Link
                href="/login"
                className="text-[#5D5A88] px-4 py-2 hover:bg-gray-200 rounded-md"
              >
                ออกจากระบบ
              </Link>
            </li>
          </ul>
        </header>

        {/* Mobile Sidebar */}
        {menuOpen && <Sidebar isMobile onClose={() => setMenuOpen(false)} />}

        {/* Main Content */}
        <main className="p-6">
          <h2 className="text-3xl text-white text-center">คู่มือการใช้งาน</h2>
        </main>
      </div>
    </div>
  );
}
