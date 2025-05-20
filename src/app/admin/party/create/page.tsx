"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/lib/firebase";

export default function AdminCreatePartyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      alert("❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/login");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1) ส่งข้อมูลไปยัง API เพื่อสร้างใน PostgreSQL + Neo4j
      const res = await fetch("/api/admin/party", {
        method: "POST",
        body: JSON.stringify({ name, description, link }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("เพิ่มพรรคไม่สำเร็จ");
      const { id } = await res.json(); // รับ id กลับมาเพื่อเก็บ logo

      // 2) อัปโหลดโลโก้
      if (logoFile) {
         const storageRef = ref(storage, `party/logo/${name}.png`);
  await uploadBytes(storageRef, logoFile); 
  const url = await getDownloadURL(storageRef);


      }

      alert("✅ เพิ่มพรรคสำเร็จ");
      router.push("/admin/party");
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#9795B5] flex items-center justify-center text-white px-4">
    <div className="max-w-xl w-full">
      <h1 className="text-3xl font-bold mb-6 text-center">➕ เพิ่มพรรคใหม่</h1>
      <form onSubmit={handleSubmit} className="bg-white text-black p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block font-semibold mb-1">ชื่อพรรค</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">เว็บไซต์ (ถ้ามี)</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="mb-6">
          <label className="block font-semibold mb-1">โลโก้พรรค (PNG)</label>
          <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file)); // สร้าง preview
  }}
  className="w-full"
/>

        </div>

        {previewUrl && (
  <div className="mt-4">
    <p className="font-semibold mb-1">Preview โลโก้:</p>
    <img src={previewUrl} alt="Preview" className="h-32 rounded shadow-md mb-4" />
  </div>
)}

<div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#5D5A88] text-white px-6 py-2 rounded hover:bg-[#46426b] disabled:opacity-50"
        >
          {submitting ? "กำลังเพิ่ม..." : "เพิ่มพรรค"}
        </button>
        </div>
      </form>
    </div>
  </div>
  );
}
