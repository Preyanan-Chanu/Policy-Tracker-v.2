"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/components/AdminSidebar";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

interface Party {
    id: number;
    name: string;
    description: string;
    link?: string;
    logo: string;
}

export default function AdminPartyPage() {
    const [parties, setParties] = useState<Party[]>([]);
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "admin") {
            alert("❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/login");
        }
    }, []);

    useEffect(() => {
  const fetchParties = async () => {
    const res = await fetch("/api/admin/party");
    const data = await res.json();

    // สร้าง promises สำหรับโหลด logo URL ของแต่ละพรรค
    const enriched = await Promise.all(
      data.map(async (party: Party) => {
        try {
          const logoRef = ref(storage, `party/logo/${party.name}.png`);
          const logoUrl = await getDownloadURL(logoRef);
          return { ...party, logo: logoUrl }; // เพิ่ม logo เข้า object
        } catch (err) {
          console.warn("⚠️ โหลดโลโก้ไม่สำเร็จ:", party.name, err);
          return { ...party, logo: "/default-party-logo.png" }; // fallback
        }
      })
    );

    setParties(enriched);
  };

  fetchParties();
}, []);


    const handleAdd = () => {
        router.push("/admin/party/create");
    };

    const handleEdit = (id: number) => {
        router.push(`/admin/party/edit/${id}`);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("คุณแน่ใจว่าต้องการลบพรรคนี้?")) return;
        const res = await fetch(`/api/admin/party/${id}`, { method: "DELETE" });
        if (res.ok) {
            setParties((prev) => prev.filter((p) => p.id !== id));
        } else {
            alert("❌ ลบไม่สำเร็จ");
        }
    };

    return (
        <div className="flex min-h-screen">
            <AdminSidebar />
            <div className="flex-1 bg-[#9795B5] text-white p-10 ml-64">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">จัดการพรรคการเมือง</h1>
                    <button
                        onClick={handleAdd}
                        className="bg-white text-[#5D5A88] font-semibold px-4 py-2 rounded hover:bg-gray-200"
                    >
                        ➕ เพิ่มพรรคใหม่
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {parties.map((party) => {
                        


                        return (
                            <div
                                key={party.id}
                                className="bg-white text-black p-4 rounded shadow-md flex flex-col justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <img src={party.logo} alt="โลโก้พรรค" className="w-32 h-32 object-contain rounded" />
                                    <div className="border-l border-gray-300 pl-4 ml-2 h-full">
                                        <h2 className="text-xl font-bold">{party.name}</h2>
                                        <p className="text-sm text-gray-600 line-clamp-2">{party.description}</p>
                                        {party.link && (
                                            <a
                                                href={party.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 underline text-sm"
                                            >
                                                เว็บไซต์
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                    <button
                                        onClick={() => handleEdit(party.id)}
                                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(party.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
