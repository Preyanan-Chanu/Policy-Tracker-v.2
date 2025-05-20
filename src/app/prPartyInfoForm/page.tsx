"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PRSidebar from "../components/PRSidebar";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

export default function PRPartyInfoForm() {
  const router = useRouter();

  const [partyList, setPartyList] = useState<string[]>([]);
  const [partyName, setPartyName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState("");

  const partyId = typeof window !== "undefined" ? localStorage.getItem("partyId") ?? "" : "";

  useEffect(() => {
    const fetchPartyList = async () => {
      try {
        const res = await fetch("/api/party");
        const data = await res.json();
        const names = data.map((p: any) => p.name);
        setPartyList(names);

        
      } catch (err) {
        console.error("Error fetching party list:", err);
      }
    };
    fetchPartyList();
  }, []);

  useEffect(() => {
  if (!partyId) return;

  const fetchPartyInfo = async () => {
    try {
      const res = await fetch(`/api/pr-partyinfo/${partyId}`);
      if (res.ok) {
        const data = await res.json();
        setPartyName(data.name || "");
        setDescription(data.description || "");
        setLink(data.link || "");
        setExistingLogoUrl(
          `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(data.name)}.png?alt=media`
        );
      } else {
        setPartyName("");
        setDescription("");
        setLink("");
        setExistingLogoUrl("");
      }
    } catch (err) {
      console.error("Error loading party:", err);
    }
  };

  fetchPartyInfo();
}, [partyId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let logoUrl = existingLogoUrl;
    try {
      if (logoFile) {
        const logoRef = ref(storage, `party/logo/${partyName}.png`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(partyName)}.png?alt=media`;
      }

      const payload = {
        name: partyName,
        description,
        link,
        logo: logoUrl,
      };

      const res = await fetch(`/api/pr-partyinfo/${partyId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
    
 });


      if (res.ok) {
        alert("✅ บันทึกสำเร็จ");
        router.push("/prPartyInfo");
      } else {
        alert("❌ บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">จัดการข้อมูลพรรค</h1>
          <Link href="/login" className="text-[#5D5A88]">ออกจากระบบ</Link>
        </header>

        <h1 className="text-3xl text-white mt-6 mb-4 text-center">ฟอร์มข้อมูลพรรค</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg max-w-xl mx-auto">
          <div className="mb-4">
            <label className="block text-[#5D5A88] font-semibold mb-1">ชื่อพรรค</label>
            <input
              type="text"
              value={partyName}
              readOnly
              className="w-full border border-gray-300 rounded-md px-4 py-2 bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#5D5A88] mb-2 font-semibold">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2"
              rows={4}
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#5D5A88] mb-2 font-semibold">เว็บไซต์</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[#5D5A88] mb-2 font-semibold">โลโก้พรรค</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            {existingLogoUrl && (
              <img src={existingLogoUrl} alt="โลโก้พรรค" className="mt-4 h-32 rounded shadow-md" />
            )}
          </div>

          <button
            type="submit"
            className="bg-[#5D5A88] text-white px-6 py-2 rounded-md hover:bg-[#46426b]"
          >
            บันทึกข้อมูล
          </button>
        </form>
      </div>
    </div>
  );
}
