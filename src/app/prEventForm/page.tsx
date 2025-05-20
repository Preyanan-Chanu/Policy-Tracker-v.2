// ✅ page.tsx - Event Form Page (with province dropdown and map marker)
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PRSidebar from "../components/PRSidebar";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {ref, uploadBytes, getDownloadURL, listAll, deleteObject, } from "firebase/storage";
import { storage } from "@/app/lib/firebase";
import { useGoogleMapsLoader } from "@/app/lib/googleMapsLoader";


const containerStyle = {
  width: "100%",
  height: "400px",
};

const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ",
  "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์",
  "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี",
  "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา",
  "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี",
  "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
  "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี",
  "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล",
  "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี",
  "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์",
  "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี",
  "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
];

export default function PREventForm() {
  const [eventName, setEventName] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [eventDes, setEventDes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [province, setProvince] = useState("");
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [partyName, setPartyName] = useState("ไม่ทราบชื่อพรรค");
  const [policies, setPolicies] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [eventStatus, setEventStatus] = useState("เริ่มต้น");
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");
  const isEditing = !!eventId;
  const libraries: ("places")[] = ["places"];
  const [eventPictures, setEventPictures] = useState<File[]>([]);
const [uploadedPictureUrls, setUploadedPictureUrls] = useState<string[]>([]);
const [picturesToDelete, setPicturesToDelete] = useState<string[]>([]);
const [bannerFile, setBannerFile] = useState<File | null>(null);
const [bannerPreview, setBannerPreview] = useState<string | null>(null);





  const router = useRouter();

  const { isLoaded } = useGoogleMapsLoader();
  

  useEffect(() => {
    const stored = localStorage.getItem("partyName");
    if (stored) {
      setPartyName(stored);
      fetch(`/api/prEventForm?party=${encodeURIComponent(stored)}`)
        .then((res) => res.json())
        .then((data) => setPolicies(data.policies || []));
    } else {
      alert("ไม่พบข้อมูลพรรค กรุณาเข้าสู่ระบบใหม่");
    }
  }, []);

  useEffect(() => {
    if (policyName) {
      fetch(`/api/prEventForm?policy=${encodeURIComponent(policyName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.campaigns)) {
            setCampaigns(data.campaigns);
          } else {
            setCampaigns([]);
          }
        });
    } else {
      setCampaigns([]);
    }
  }, [policyName]);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventData = async () => {
      const res = await fetch(`/api/pr-event/${eventId}`);
      const data = await res.json();

      setEventName(data.name || "");
      setEventDes(data.description || "");
      setEventDate(data.date || "");
      setEventTime(data.time || "");
      setEventLocation(data.location || "");
      setProvince(data.province || "");
      setMarkerPos(data.map ? {
        lat: parseFloat(data.map.split(",")[0]),
        lng: parseFloat(data.map.split(",")[1]),
      } : null);
      setPolicyName(data.policy || "");
      setSelectedCampaign(data.campaign || "");
      setEventStatus(data.status || "เริ่มต้น"); // ✅ โหลดสถานะ
       console.log("📦 Event province:", data.province);

       try {
  const folderRef = ref(storage, `event/picture/${eventId}`);
  const listResult = await listAll(folderRef);
  const urls = await Promise.all(listResult.items.map((item) => getDownloadURL(item)));
  setUploadedPictureUrls(urls);
} catch (err) {
  console.warn("ไม่พบภาพกิจกรรม:", err);
}

try {
      const bannerJpg = `event/banner/${eventId}.jpg`;
const bannerPng = `event/banner/${eventId}.png`;

      try {
        const jpgUrl = await getDownloadURL(ref(storage, bannerJpg));
        setBannerPreview(jpgUrl);
      } catch {
        const pngUrl = await getDownloadURL(ref(storage, bannerPng));
        setBannerPreview(pngUrl);
      }
    } catch {
      setBannerPreview(null);
    }

    };

    

      fetchEventData();
  }, [eventId]);



  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!markerPos || !province) {
    alert("กรุณาเลือกตำแหน่งและจังหวัด");
    return;
  }

  const payload = {
    id: eventId,
    name: eventName,
    description: eventDes,
    date: eventDate,
    time: eventTime,
    location: eventLocation,
    province,
    map: `${markerPos.lat},${markerPos.lng}`,
    policy: policyName,
    party: partyName,
    campaign: selectedCampaign,
    status: eventStatus,
  };

  const res = await fetch("/api/prEventForm", {
    method: eventId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  const id = eventId || result.id; // ใช้ eventId ถ้าแก้ไข, ใช้ result.id ถ้าสร้างใหม่
  if (!id) {
    alert("ไม่พบ event ID ไม่สามารถอัปโหลดไฟล์ได้");
    return;
  }

  // ✅ อัปโหลด banner
  if (bannerFile) {
    const fileExt = bannerFile.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
    const bannerRef = ref(storage, `event/banner/${id}.${fileExt}`);
    await uploadBytes(bannerRef, bannerFile);
  }

  // ✅ ลบรูปภาพที่เลือกไว้
  for (const path of picturesToDelete) {
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn("ลบภาพไม่สำเร็จ:", err);
    }
  }

  // ✅ อัปโหลดภาพใหม่
  for (const file of eventPictures) {
    const uniqueName = `${Date.now()}_${file.name}`;
    const imageRef = ref(storage, `event/picture/${id}/${uniqueName}`);
    await uploadBytes(imageRef, file);
  }

  if (res.ok) {
    alert(eventId ? "✅ แก้ไขกิจกรรมสำเร็จ" : "✅ บันทึกกิจกรรมสำเร็จ");
    router.push("/prEvent");
  } else {
    const text = await res.text();
    alert("❌ บันทึกไม่สำเร็จ: " + text);
  }
};

  

  return (
    <div className="min-h-screen bg-[#9795B5] flex">
      <PRSidebar />
      <div className="flex-1 md:ml-64 p-6">
        <h2 className="text-3xl text-white text-center">ฟอร์มกิจกรรม</h2>
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block font-bold">ชื่อกิจกรรม:</label>
            <input required value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">รายละเอียดกิจกรรม:</label>
            <textarea required value={eventDes} onChange={(e) => setEventDes(e.target.value)} className="w-full p-2 border rounded" />

            {isEditing && (
              <>
                <label className="block font-bold">สถานะกิจกรรม:</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="เริ่มต้น">เริ่มต้น</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                  <option value="ยกเลิก">ยกเลิก</option>
                </select>
              </>
            )}


            <label className="block font-bold">วันจัดกิจกรรม:</label>
            <input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">เวลา:</label>
            <input required value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">สถานที่:</label>
            <input required value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full p-2 border rounded" />

            <label className="block font-bold">จังหวัดที่จัดกิจกรรม:</label>
            <select required value={province} onChange={(e) => setProvince(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- เลือกจังหวัด --</option>
             {PROVINCES.map((p, idx) => (
    <option key={`province-${idx}`} value={p}>{p}</option>
  ))}
            </select>

            <label className="block font-bold">นโยบายที่เกี่ยวข้อง:</label>
            <select value={policyName} onChange={(e) => setPolicyName(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกนโยบาย --</option>
             {policies.map((p, idx) => (
    <option key={`policy-${idx}`} value={p}>{p}</option>
  ))}
            </select>

            <label className="block font-bold">โครงการที่เกี่ยวข้อง:</label>
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- ไม่เลือกโครงการ --</option>
              {campaigns.map((c, idx) => (
    <option key={`campaign-${idx}`} value={c}>{c}</option>
  ))}
            </select>
             
            <label className="block font-bold">เลือกตำแหน่งบนแผนที่:</label>
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={markerPos || { lat: 13.736717, lng: 100.523186 }}
                zoom={markerPos ? 14 : 12}
                onClick={(e) =>
                  setMarkerPos({ lat: e.latLng?.lat() || 0, lng: e.latLng?.lng() || 0 })
                }
              >
                {markerPos && <Marker position={markerPos} />}
              </GoogleMap>
            )}

            <label className="block font-bold">อัปโหลดรูปภาพเพิ่มเติม:</label>
<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    if (e.target.files) {
      setEventPictures([...eventPictures, ...Array.from(e.target.files)]);
    }
  }}
  className="w-full"
/>

{/* รูป preview ก่อนอัปโหลด */}
{eventPictures.length > 0 && (
  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
    {eventPictures.map((file, idx) => (
      <div key={idx} className="relative">
        <img src={URL.createObjectURL(file)} className="rounded shadow w-full" />
        <button
          type="button"
          onClick={() => setEventPictures(eventPictures.filter((_, i) => i !== idx))}
          className="absolute top-2 right-2 bg-red-600 text-white rounded-full text-xs px-2"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}

{/* รูปจาก Storage ที่อัปโหลดแล้ว */}
{uploadedPictureUrls.length > 0 && (
  <div className="mt-6">
    <h3 className="font-bold text-[#5D5A88] mb-2">ภาพที่อัปโหลดแล้ว:</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {uploadedPictureUrls.map((url, idx) => (
        <div key={idx} className="relative">
          <img src={url} className="rounded shadow w-full" />
          <button
            type="button"
            onClick={() => {
              const match = decodeURIComponent(url).match(/\/o\/(.+)\?/);
              const path = match?.[1];
              if (!path) return;
              setPicturesToDelete((prev) => [...prev, path]);
              setUploadedPictureUrls(uploadedPictureUrls.filter((_, i) => i !== idx));
            }}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full text-xs px-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>
)}


<div className="mb-4">
  <label className="block font-bold">อัปโหลด Banner กิจกรรม:</label>
  <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    if (file) setBannerPreview(URL.createObjectURL(file));
  }}
  className="mb-4"
/>

</div>

{bannerPreview && (
  <div className="mt-2">
    <p className="text-sm text-[#5D5A88]">Preview:</p>
    <img src={bannerPreview} alt="Banner Preview" className="h-100 rounded shadow-md" />
  </div>
)}



            <button type="submit" className="w-full bg-[#5D5A88] text-white py-2 rounded">บันทึก</button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
