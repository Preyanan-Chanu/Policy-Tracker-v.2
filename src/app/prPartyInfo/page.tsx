"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PRSidebar from "../components/PRSidebar";
import { collection, getDocs, getDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";
import { storage } from "@/app/lib/firebase";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import LazyImage from "../components/LazyImage";


interface PartyInfo {
  party_des: string;
  party_link: string;
  party_logo: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  role: string;
  image: string;
}

export default function PRPartyInfo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState<string | null>(null);
  const pageSize = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const router = useRouter();

  const visibleMembers = members.slice(0, currentPage * pageSize);
  const hasMore = visibleMembers.length < members.length;

  const resizeImage = (file: File, maxSize = 600): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return reject("ไม่พบรูป");

        img.src = e.target.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Resize failed");
          }, "image/jpeg", 0.8);
        };
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };



  useEffect(() => {
    if (!observerRef.current || members.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      {
        rootMargin: "100px", // ✅ เพิ่มเพื่อให้ตรวจเจอเร็วขึ้น
        threshold: 0.1,       // ✅ ลดลงเพื่อให้เกิด trigger ง่าย
      }
    );

    observer.observe(observerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [members]);



  useEffect(() => {
    const id = localStorage.getItem("partyId");
    const name = localStorage.getItem("partyName")?.replace(/^พรรค\s*/g, "").trim() || null;
    console.log("🔍 partyId =", id);
    console.log("🔍 partyName =", name);
    if (id) setPartyId(id);
    if (name) setPartyName(name);
  }, []);


  useEffect(() => {
    if (!partyId || !partyName) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/pr-partyinfo/${partyId}`);
        const data = await res.json();

        // ✅ โหลดโลโก้จาก id โดย fallback เป็น .jpg หาก .png ไม่เจอ
        let logoUrl = "/default-party-logo.png";
        try {
          const pngUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(partyId)}.png?alt=media`;
          const res = await fetch(pngUrl);
          if (res.ok) {
            logoUrl = pngUrl;
          } else {
            const jpgUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(partyId)}.jpg?alt=media`;
            const res2 = await fetch(jpgUrl);
            if (res2.ok) {
              logoUrl = jpgUrl;
            }
          }
        } catch (err) {
          console.warn("⚠️ โหลดโลโก้ไม่สำเร็จ:", err);
        }

        setPartyInfo({
          party_des: data.description ?? "-",
          party_link: data.link ?? "-",
          party_logo: logoUrl,
        });

        const memberSnapshot = await getDocs(collection(firestore, "Party", partyId!, "Member"));


        const memberData = await Promise.all(
          memberSnapshot.docs.map(async (docSnap) => {
            const member = docSnap.data();
            const firstName: string = member.FirstName || "ไม่ระบุชื่อ";
            const lastName: string = member.LastName || "ไม่ระบุนามสกุล";

            const id = member.id || docSnap.id;
            const role = member.Role || "-";

            // 🔁 เตรียมชื่อไฟล์รูปตามรูปแบบ "ชื่อ_นามสกุล"
            const fileBase = `${firstName}_${lastName}`.replace(/\s+/g, "_");
            const imagePaths = [
              `party/member/${partyId}/${fileBase}.jpg`,
              `party/member/${partyId}/${fileBase}.png`
            ];

            let pictureUrl = "/default-profile.png";

            for (const path of imagePaths) {
              try {
                const res = await fetch(
                  `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.appspot.com/o/${encodeURIComponent(path)}?alt=media`
                );
                if (res.ok) {
                  pictureUrl = res.url;
                  break;
                }
              } catch { }
            }

            return {
              id,
              name: firstName,
              surname: lastName,
              role,
              image: pictureUrl,
            };
          })
        );

        setMembers(memberData);

      } catch (error) {
        console.error("Error fetching party info:", error);
      }
    };

    fetchData();
  }, [partyId, partyName]);


  const goToPartyInfoForm = () => router.push("/prPartyInfoForm");
  const goToMemberForm = () => router.push("/prMemberForm");


  const deleteMember = async (id: string) => {
    if (!partyId || !confirm("คุณต้องการลบสมาชิกคนนี้หรือไม่?")) return;
    try {
      // ✅ ดึงข้อมูลสมาชิกจาก Firestore ก่อนลบ
      const docRef = doc(firestore, "Party", partyId!, "Member", String(id));


      const docSnap = await getDoc(docRef);
      const data = docSnap.data();

      const firstName = data?.FirstName ?? "ไม่ระบุชื่อ";
      const lastName = data?.LastName ?? "ไม่ระบุนามสกุล";

      const nameParts = firstName.trim().split(" ");
      const fullName =
        nameParts.length > 1
          ? `${nameParts[0]}_${nameParts.slice(1).join("_")}_${lastName}`
          : `${firstName}_${lastName}`;

      const basePath = `party/member/${partyId}/${id}`;



      // ✅ ลบ Firestore document
      await deleteDoc(docRef);

      // ✅ ลบไฟล์จาก Firebase Storage (.jpg และ .png)
      const jpgRef = ref(storage, `party/member/${partyId}/${id}.jpg`);
      const pngRef = ref(storage, `party/member/${partyId}/${id}.png`);

      try {
        await deleteObject(jpgRef);
      } catch (err) {
        console.warn("⚠️ ลบ .jpg ไม่สำเร็จ:", (err as any).message);
      }

      try {
        await deleteObject(pngRef);
      } catch (err) {
        console.warn("⚠️ ลบ .png ไม่สำเร็จ:", (err as any).message);
      }

      // ✅ ลบจาก state
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setBulkImages(fileArray);
    setPreviewUrls(fileArray.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...bulkImages];
    const updatedPreviews = [...previewUrls];

    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setBulkImages(updatedImages);
    setPreviewUrls(updatedPreviews);
  };

  const handleClearAll = () => {
    setBulkImages([]);
    setPreviewUrls([]);
  };

  const editMember = (id: string | number) => {
    router.push(`/prMemberFormEdit?editId=${id}`);
  };


  if (!partyName) {
    return <div className="text-center text-white py-10">กำลังโหลดข้อมูลพรรค...</div>;
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex" style={{ backgroundImage: "url('/bg/ผีเสื้อ.jpg')" }}>
      <PRSidebar />
      <div className="flex-1 md:ml-64">
        <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#5D5A88]">PR พรรค {partyName}</h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-3xl text-[#5D5A88]">☰</button>
        </header>

        <main className="p-6">
          <div className="flex justify-end mb-4">
            <button onClick={goToPartyInfoForm} className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]">
              ✏ แก้ไขข้อมูลพรรค
            </button>
          </div>

          <h2 className="text-3xl text-white text-center">ข้อมูลพรรค</h2>
          {partyInfo && (
            <div className="bg-white p-6 rounded-lg shadow-lg mt-4 relative">

              <p><strong>รายละเอียด:</strong> {partyInfo.party_des}</p>
              <p>
                <strong>เว็บไซต์:</strong>{" "}
                <a
                  href={partyInfo.party_link}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  {partyInfo.party_link}
                </a>
              </p>
              <img
                src={partyInfo.party_logo}
                alt="โลโก้พรรค"
                className="mt-4 h-32 rounded shadow-md"
              />
            </div>
          )}

          <div className="flex justify-between mt-6">

            <button
              onClick={async () => {
                if (!partyId) return;
                const confirmDelete = confirm("⚠️ ต้องการลบสมาชิกทั้งหมดหรือไม่?");
                if (!confirmDelete) return;

                const snapshot = await getDocs(collection(firestore, "Party", partyId, "Member"));
                for (const docSnap of snapshot.docs) {
                  const id = docSnap.id;
                  await deleteDoc(doc(firestore, "Party", partyId, "Member", id));
                  try {
                    await deleteObject(ref(storage, `party/member/${partyId}/${id}.jpg`));
                    await deleteObject(ref(storage, `party/member/${partyId}/${id}.png`));
                  } catch { }
                }

                alert("✅ ลบสมาชิกทั้งหมดสำเร็จ");
                location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              🧹 ลบสมาชิกทั้งหมด
            </button>

            <button
              onClick={async () => {
                if (!partyName) return alert("ไม่พบชื่อพรรค");
                const party = partyName.replace(/^พรรค\s*/, "").trim();

                try {
                  const res = await fetch(`/api/scrape-member?party=${encodeURIComponent(party)}`);
                  const data = await res.json();
                  console.log("จำนวนสมาชิกที่ดึงได้:", data.members?.length);


                  if (data.members?.length > 0) {
                    const confirmUpload = confirm(`ดึงข้อมูล ${data.members.length} คน ต้องการบันทึกทั้งหมดหรือไม่?`);
                    if (!confirmUpload) return;

                    for (const [index, m] of data.members.entries()) {
                      const nameParts = m.name.trim().split(" ");
                      const firstName = nameParts.slice(0, -1).join(" ") || "-";
                      const lastName = nameParts.slice(-1)[0] || "-";

                      const role = m.role ?? "-";

                      // หาไฟล์รูปจาก public (หรือคุณสามารถเปลี่ยนเป็น upload directory ได้)
                      const filename = `${firstName}_${lastName}`.replace(/\s+/g, "_");
                      const inputFile = await fetch(`/members/${filename}.jpg`)
                        .then(res => res.blob())
                        .catch(() => null);

                      if (!inputFile) {
                        console.warn(`ไม่พบรูปภาพสำหรับ ${filename}`);
                        continue;
                      }

                      const memberCollection = collection(firestore, `Party/${partyId}/Member`);
                      const snapshot = await getDocs(memberCollection);
                      const maxId = Math.max(...snapshot.docs.map(doc => doc.data().id || 0), 0);
                      const newId = maxId + 1;

                      const imageRef = ref(storage, `party/member/${partyId}/${newId}.jpg`);
                      await uploadBytes(imageRef, inputFile);

                      const docRef = doc(firestore, `Party/${partyId}/Member`, String(newId));
                      await setDoc(docRef, {
                        FirstName: firstName,
                        LastName: lastName,
                        Role: role,
                        Picture: `/member/${newId}.jpg`,
                        id: newId,
                      });
                      console.log(`✅ เพิ่ม ${firstName} ${lastName}`);
                    }

                    alert("✅ บันทึกสมาชิกทั้งหมดสำเร็จ");
                    router.refresh();
                  } else {
                    alert("ไม่พบข้อมูลสมาชิก");
                  }
                } catch (err) {
                  console.error("❌ ดึงข้อมูลล้มเหลว", err);
                  alert("เกิดข้อผิดพลาด");
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              📥 ดึงข้อมูลสมาชิกจาก กกต.
            </button>


            <button onClick={goToMemberForm} className="bg-[#5D5A88] text-white px-4 py-2 rounded-md hover:bg-[#46426b]">
              ➕ เพิ่มข้อมูลสมาชิก
            </button>
          </div>


          <div className="flex justify-center mt-6 flex-col items-center">

            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              📁 เลือกรูปสมาชิก
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* แสดงจำนวน */}
            {bulkImages.length > 0 && (
              <p className="mt-2 text-white">{bulkImages.length} ไฟล์ที่เลือกแล้ว</p>
            )}

            {/* แสดงรูปทั้งหมด */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`preview-${idx}`}
                    className="w-32 h-32 object-cover rounded shadow-md mx-auto"
                  />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-sm hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* ปุ่มลบทั้งหมด */}
            {bulkImages.length > 0 && (
              <button
                onClick={handleClearAll}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                🗑 ลบรูปทั้งหมด
              </button>
            )}

            {bulkImages.length > 0 && (
              <button
                onClick={async () => {
                  if (!partyId || !bulkImages?.length) return;

                  for (const file of Array.from(bulkImages)) {
                    const rawName = file.name.replace(/\.[^.]+$/, "");
                    const ext = file.name.split(".").pop();
                    const encodedName = rawName.replace(/\s+/g, "_");

                    const imageRef = ref(storage, `party/member/${partyId}/${encodedName}.${ext}`);

                    try {
                      const resizedBlob = await resizeImage(file); // 👈 resize ก่อน
                      await uploadBytes(imageRef, resizedBlob);
                      console.log(`✅ อัปโหลดรูป ${encodedName}.${ext}`);
                    } catch (err) {
                      console.error(`❌ ไม่สามารถอัปโหลดรูป ${encodedName}.${ext}`, err);
                    }
                  }

                  alert("✅ อัปโหลดรูปภาพทั้งหมดสำเร็จ");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mt-4"
              >
                📁 อัปโหลดรูปสมาชิก
              </button>
            )}
          </div>



          <h2 className="text-3xl text-white text-center mt-6">สมาชิกพรรค</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
            {members
              .slice(0, currentPage * pageSize)
              .map((member) => (
                <div key={member.id} className="bg-white p-4 rounded-lg shadow-lg text-center">
                  <LazyImage
                    src={member.image}
                    alt={member.name}
                    className="w-24 h-24 mx-auto rounded-full shadow-md"
                  />
                  <p className="mt-2 font-semibold">
                    {member.name} {member.surname}
                  </p>
                  <p className="text-gray-600">{member.role}</p>
                  <div className=" mt-4">
                    <button
                      onClick={() => editMember(member.id)}
                      className="m-2 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600"
                    >
                      ✏ แก้ไข
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="m-2 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-700">
                      ❌ ลบ
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <div ref={observerRef} className="h-10 mt-10" />
        </main>
      </div>
    </div>
  );
}
