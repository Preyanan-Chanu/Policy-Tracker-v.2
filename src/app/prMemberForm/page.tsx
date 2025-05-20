"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL, } from "firebase/storage";
import { doc, setDoc, getDocs, collection} from "firebase/firestore";
import { storage, firestore } from "@/app/lib/firebase";
import PRSidebar from "../components/PRSidebar";

export default function PRMemberForm() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberSurname, setMemberSurname] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberPic, setMemberPic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const router = useRouter();

  useEffect(() => {
    const party = localStorage.getItem("partyName");
    if (party) {
      setPartyName(party);
    } else {
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/login");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMemberPic(file);
      setPreviewUrl(URL.createObjectURL(file)); // preview image
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!memberName || !memberSurname || !memberRole || !memberPic) {
    alert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  const fileExt = memberPic.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
  const fullName = `${memberName.trim()}_${memberSurname.trim()}`;
  const firestorePath = `Party/${partyName}/Member`;

  try {
    // ✅ ดึง collection และคำนวณ id ใหม่
    const memberCollection = collection(firestore, firestorePath);
    const snapshot = await getDocs(memberCollection);

    const validIds = snapshot.docs
  .map(doc => doc.data().id)
  .filter(id => typeof id === "number" && !isNaN(id));

    const maxId = Math.max(...snapshot.docs.map(doc => doc.data().id || 0), 0);
    const newId = maxId + 1;

    // ✅ Upload Image ด้วยชื่อ id
    const imageRef = ref(storage, `party/member/${partyName}/${newId}.${fileExt}`);
    await uploadBytes(imageRef, memberPic);
    const imageUrl = await getDownloadURL(imageRef);

    // ✅ บันทึกข้อมูล Firestore โดยใช้ fullName เป็น documentId
    const docRef = doc(firestore, firestorePath, String(newId));
    await setDoc(docRef, {
      FirstName: memberName,
      LastName: memberSurname,
      Role: memberRole,
      Picture: `/member/${newId}.${fileExt}`,
      id: newId,
    });

    alert("✅ บันทึกข้อมูลสมาชิกสำเร็จ");
    router.push("/prPartyInfo");
  } catch (err) {
    console.error("❌ Error saving member:", err);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  }
};


  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
        </header>

        <main className="p-6">
          <h2 className="text-3xl text-white text-center mb-6">เพิ่มข้อมูลสมาชิก</h2>
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-bold">ชื่อ:</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">นามสกุล:</label>
                <input
                  type="text"
                  value={memberSurname}
                  onChange={(e) => setMemberSurname(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">ตำแหน่ง:</label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block font-bold">อัปโหลดรูปสมาชิก:</label>
                <input type="file" accept="image/*" onChange={handleFileChange} required />
              </div>

              {previewUrl && (
                <div>
                  <label className="block font-bold mt-2">Preview:</label>
                  <img src={previewUrl} alt="Preview" className="w-40 rounded-md shadow-md" />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#5D5A88] text-white p-3 rounded-md hover:bg-[#46426b] mt-4"
              >
                บันทึก
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
