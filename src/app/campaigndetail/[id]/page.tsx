"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";
import { storage, } from "@/app/lib/firebase";
import { getDownloadURL, ref } from "firebase/storage";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { Heart } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { listAll, } from "firebase/storage";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartOptions } from 'chart.js';

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';



ChartJS.register(
   ChartDataLabels      // ✅ ลงทะเบียน DataLabels
);

import { Doughnut } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';

// ✅ Register ArcElement (สำหรับกราฟวงกลม), Tooltip, Legend
ChartJS.register(ArcElement,BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Party {
  name: string;
  description: string;
  link?: string | null;
}

const CampaignDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  // 1) รับ "id" จาก URL แทน "name"
  const campaignId = decodeURIComponent(params.id as string);
  // 2) เก็บชื่อจริงของแคมเปญ
  const [name, setName] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [budget, setBudget] = useState<number>(0);
const [expenses, setExpenses] = useState<{ description: string; amount: number }[]>([]);
const totalUsed = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
const remaining = budget - totalUsed;
  // 2. State เก็บ like
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  const [status, setStatus] = useState<number | null>(null); // เก็บสถานะจาก Neo4j
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const stepMap: Record<string, { label: string; color: string; step: number }> = {
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  };
  // เปลี่ยน type ของ relatedProjects ให้มี id ด้วย
const [relatedProjects, setRelatedProjects] = useState<
  { id: string; name: string; description: string }[]
>([]);

// เปลี่ยน policy ให้มี id ด้วย
const [policy, setPolicy] = useState<
  { id: string; name: string; description: string; status: string } | null
>(null);

  const [party, setParty] = useState<
    { name: string; description?: string; link?: string } | null
  >(null);
  
  const [relatedEvents, setRelatedEvents] = useState<{ name: string; description: string }[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  // ─── Effect #1: Fetch campaign data by ID → derive `name` and seed basic states ───
  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/campaigndetail/${encodeURIComponent(campaignId)}`
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        // แปลง ID → name
        setName(data.name || "");
        // ตั้งค่าเบื้องต้น (เหมือนที่เคยทำใน fetchNeo4j)
        setPolicyName(data.name || "");
        setDescription(data.description || "");
        setStatus(data.status || null);
        
       setRelatedProjects(
  (data.relatedProjects || []).map((p: any) => {
    const rawId = p.id;
    const idString =
      typeof rawId?.toNumber === "function"
        ? rawId.toNumber().toString()
        : rawId && typeof rawId === "object" && "low" in rawId
          ? String(rawId.low)
          : String(rawId);
    return {
      id: idString,
      name: p.name,
      description: p.description,
    };
  })
);

    setParty(data.party || null);

        // ตั้ง policy จาก data.policy โดยตรง (อ่าน JSON แค่ครั้งเดียว)
        if (data.policy) {
          const raw = data.policy.id;
const idString =
  typeof raw?.toNumber === "function"
    ? raw.toNumber().toString()
    : raw && typeof raw === "object" && "low" in raw
      ? String(raw.low)
      : String(raw);

          setPolicy({
            id: idString,
            name: data.policy.name,
            description: data.policy.description,
            status: data.policy.status,
          });
        } else {
          setPolicy(null);
        }
        
        setRelatedEvents(Array.isArray(data.relatedEvents) ? data.relatedEvents : []);
         setBudget(data.budget || 0);
    setExpenses(data.expenses || []);
      } catch (err) {
        console.error("Error fetching campaign by ID:", err);
      }
    })();
  }, [campaignId]);

  useEffect(() => {
    const loadPdfUrl = async () => {
      if (!name) return;

      try {
        const pdfRef = ref(storage, `campaign/reference/${name}.pdf`);
        const url = await getDownloadURL(pdfRef);
        setPdfUrl(url);
      } catch (err) {
        console.warn("ไม่พบ PDF สำหรับโครงการนี้");
        setPdfUrl(""); // หรือ null
      }
    };

    loadPdfUrl();
  }, [name]);

  useEffect(() => {
    console.log("✅ Status จาก Neo4j:", status);
  }, [status]);



  useEffect(() => {
     if (!name) return;  
    const fetchPolicy = async () => {
      const res = await fetch(`/api/policydetail/${encodeURIComponent(name)}`);
      const data = await res.json();
      setPolicyName(data.name || "name");
      setDescription(data.description || "");
      setStatus(data.status || null); // เก็บค่า status
    };
    
  

    // 🔴 2. ดึงจำนวน like จาก API หลังจาก fetchNeo4j()
    fetch(`/api/campaignlike?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.like;
        const count = typeof raw === "number"
          ? raw
          : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
        setLikeCount(count || 0);
      });
    // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
    setIsLiked(localStorage.getItem(`liked_${name}`) === "true"); // 🔴 2. ดึงจำนวน like จาก API หลังจาก fetchNeo4j()
    fetch(`/api/campaignlike?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.like;
        const count = typeof raw === "number"
          ? raw
          : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
        setLikeCount(count || 0);
      });
    // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
    setIsLiked(localStorage.getItem(`liked_${name}`) === "true");
  }, [name]);

  const handleLike = async () => {
    const action = isLiked ? "decrement" : "increment";
    try {
      const res = await fetch("/api/campaignlike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: policyName, action }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const raw = data.like;
      const newCount =
        typeof raw === "number"
          ? raw
          : typeof raw?.toNumber === "function"
            ? raw.toNumber()
            : Number(raw) || 0;
      setLikeCount(newCount);

      const newVal = !isLiked;
      setIsLiked(newVal);
      localStorage.setItem(`liked_${policyName}`, newVal.toString());
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };


  useEffect(() => {
    // สมมติว่าใน Firebase Console คุณอัปโหลดโฟลเดอร์ชื่อตรง ๆ
    // เช่น "campaign/picture/My Campaign" (มีช่องว่าง, อักขระไทย ฯลฯ)
    const folderRef = ref(storage, `campaign/picture/${name}`);

    listAll(folderRef)
      .then(res => {
        // ดูว่ามันเจอไฟล์อะไรบ้าง
        console.log("found items:", res.items.map(i => i.fullPath));
        return Promise.all(res.items.map(item => getDownloadURL(item)));
      })
      .then(urls => {
        console.log("download URLs:", urls);
        setGalleryUrls(urls);
      })
      .catch(err => {
        console.error("โหลดแกลเลอรีผิดพลาด:", err);
      });
  }, [name]);

// คำนวณค่ามากสุด แล้วเผื่อไว้ 20%
const maxExpense = expenses.length
  ? Math.max(...expenses.map(e => e.amount))
  : 0;
const suggestedTop = maxExpense * 1.2;

  const data = {
  labels: ['ใช้ไปแล้ว', 'งบคงเหลือ'],
  datasets: [
    {
      data: [ totalUsed, remaining],
      backgroundColor: ['#64C2C7', ' #FBBF24'],
       hoverBackgroundColor: [
        '#4BA6AB',
        'F59E0B'
      ],
      borderWidth: 1,
    },
  ],
};

const options = {
  cutout: '70%',
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
    },
    datalabels: {
      color: '#fff',
      formatter: (value: number, ctx: any) => {
        const dataArr = ctx.chart.data.datasets[0].data as number[];
        const sum = dataArr.reduce((acc, cur) => acc + cur, 0);
        const percentage = (value * 100 / sum).toFixed(1);
        return percentage + '%';
      },
      font: {
        weight: 700
      }
    }
  },
};

// เรียง expenses จากจำนวนเงินมาก → น้อย
const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);

const barData = {
  labels: sortedExpenses.map((e) => String(e.description)), // ✅ ไม่แปลงเป็นเลข
  datasets: [
    {
      label: 'จำนวนเงิน (บาท)',
      data: sortedExpenses.map((e) => e.amount),
      backgroundColor: '#33828D',
      borderColor: '#286F75',
      borderRadius: 6,
    },
  ],
};

const barOptions: ChartOptions<'bar'> = {
  maintainAspectRatio: false,    // ① ปิด aspect ratio
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function (context) {
          const val = context.raw as number;
      return `จำนวนเงิน: ${val.toLocaleString("th-TH")} บาท`;
        }
      }
    },
    datalabels: {
      anchor: 'end' as const,    // cast เป็น literal
      align:  'top'  as const,    // cast เป็น literal
      formatter: (value: number) =>
        value.toLocaleString("th-TH") + ' บาท',
      font: { weight: 700 }       // number 700 = bold
    }
  },
  scales: {
    y: {
      beginAtZero: true,
     suggestedMax: suggestedTop,   // ② เผื่อพื้นที่ด้านบน
      ticks: {
        callback: (tickValue) => {
          const val = typeof tickValue === 'number'
            ? tickValue
            : parseFloat(tickValue.toString());
          return val.toLocaleString("th-TH") + ' บาท';
        }
      }
    }
  },
  layout: {
     padding: { top: 20 }            // ③ เพิ่ม padding บนสุด
 }
};

const formatMoney = (val: any) =>
  Number(val || 0).toLocaleString("th-TH") + " บาท";


  return (
    <div className="font-prompt">
      <div className="bg-white">
        <Navbar />
        <div
          className="relative grid grid-rows-[auto_auto_1fr_1fr] grid-cols-4 h-[50svh] bg-cover bg-center"
          style={{
            backgroundImage: "url('/bg/หัวข้อ.png')"
          }}
        >
          <div className="flex items-start ml-10 mt-10">
            <button
              onClick={() => router.back()}
              className="
                flex items-center gap-2
                px-6 py-3
                bg-white text-[#2C3E50] font-medium
                rounded-full
                shadow-md hover:shadow-lg
               hover:!bg-[#316599] hover:!text-white
                transform hover:-translate-y-0.5
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5D5A88]/50
              "
            >
              <ArrowLeft className="w-5 h-5" />
              ย้อนกลับ
            </button>
          </div>
          <div className="col-start-2 row-start-1 row-end-2 col-span-2 row-span-2 text-center">
            <div className="col-start-2 row-start-1 row-end-2 col-span-2 row-span-2 text-center">
              {/* ชื่อหัวเรื่อง */}
              <h1 className="text-white p-10 font-bold text-[2.5rem]">
                {policyName}
              </h1>

              {/* คำอธิบายจำกัด 4 บรรทัด + ปุ่มอ่านเพิ่มเติม */}
              <div className="mx-auto max-w-3xl text-center">
                <p
                  className="text-white text-[1.5rem] m-0 overflow-hidden"
                  style={
                    !showModal
                      ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                      }
                      : {}
                  }
                >
                  {description}
                </p>
                {!showModal && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-[#ffffff] mt-2 underline"
                  >
                    อ่านเพิ่มเติม
                  </button>
                )}
              </div>

              {/* Modal แสดงข้อความเต็ม */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-md max-w-lg mx-auto">
                    <h2 className="text-xl font-semibold mb-4">
                      รายละเอียดนโยบายฉบับเต็ม
                    </h2>
                    <p className="text-black text-[1.5rem] whitespace-pre-wrap">
                      {description}
                    </p>
                    <button
                      onClick={() => setShowModal(false)}
                      className="mt-4 px-4 py-2 bg-[#5D5A88] text-white rounded-md"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Badge พรรค */}
            {party && logoUrl && (
              <Link
                href={`/party/${encodeURIComponent(party.name)}`}
                className="absolute top-6 right-6 z-20"
              >
                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center space-x-3 cursor-pointer">
                  {/* กล่องเก็บรูปขนาด 48x48px พร้อม overflow */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={logoUrl}
                      alt={`โลโก้พรรค ${party.name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-gray-800 font-semibold text-base">
                    พรรค{party.name}
                  </span>
                </div>
              </Link>
            )}

          </div>

          <div className="row-start-3 col-start-2 col-span-2 flex justify-center items-center p-10 space-x-4">
            {status && stepMap[status] && (
              <Step
                step={stepMap[status].step}
                label={stepMap[status].label}
                bgColor={stepMap[status].color}
              />
            )}
            <button onClick={handleLike} className="focus:outline-none">
              <Heart
                size={26}
                fill={isLiked ? "currentColor" : "none"}
                className={isLiked ? "text-[#e32222]" : "text-gray-200"}
              />
            </button>

            <span className="text-white text-lg">{likeCount}</span>
          </div>
        </div>


        <div className="bg-[#e2edfe] relative z-10 flex flex-col items-center h-full px-6 sm:px-10 lg:px-16 xl:px-24 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-7xl">

            {/* 🔹 ซ้าย:*/}
            <div className="space-y-10 col-span-1">

              {/* 📁 โครงการ */}
              <section>
                <h2 className="  text-xl font-bold text-[#2C3E50] mb-4">📁 โครงการที่เกี่ยวข้อง</h2>
                {relatedProjects.filter(p => p.name?.trim()).length > 0 ? (
                  <div className="space-y-4 ">
                    {relatedProjects
                      .filter(p => p.name?.trim())
                      .map((project) => (
                        <Link
                         key={project.id}
                          href={`/campaigndetail/${encodeURIComponent(project.id)}`}
                          
                          className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
                        >
                          <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{project.name}</h3>
                          <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                            {project.description}
                          </p>

                        </Link>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500">ไม่มีโครงการที่เกี่ยวข้อง</p> // ✅ แสดงข้อความแทน
                )}
             </section>

              <section>
            <div className="bg-white p-4 rounded-xl shadow-md border h-full flex flex-col items-start justify-center">
              {/* หัวข้อหลัก */}
              <h1 className="text-xl font-bold text-[#2C3E50] mb-2">
                📋 ค่าใช้จ่าย
              </h1>

              {/* ข้อความย่อย 3 ตัว วางเรียงกัน มีช่องว่างคั่น */}
              <div className="flex flex-wrap space-x-6 text-base text-gray-700 mb-4">
  <div><strong className="font-bold">งบทั้งหมด:</strong> {formatMoney(budget)}</div>
  <div><strong className="font-bold">ใช้จ่าย:</strong> {formatMoney(totalUsed)}</div>
  <div><strong className="font-bold">คงเหลือ:</strong> {formatMoney(remaining)}</div>
</div>

              {/* กราฟโดนัท */}
              <div className="flex justify-center w-full">
                <div className="w-64 h-64">
                  <Doughnut data={data} options={options} />
                </div>
              </div>
            </div>
          </section>


                

              {/* 📅 กิจกรรม */}
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">📅 กิจกรรมที่เกี่ยวข้อง</h2>
                {Array.isArray(relatedEvents) && relatedEvents.some(e => e.name && e.description) ? (
                  <div className="space-y-4">
                    {relatedEvents.map((event, idx) => (
                      <Link
                        href={`/eventdetail/${encodeURIComponent(event.name)}`}
                        key={event.name || idx}
                        className="block bg-white rounded-xl shadow-md hover:shadow-xl transition p-4 border border-gray-200"
                      >
                        <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{event.name}</h3>
                        <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                          {event.description}
                        </p>

                      </Link>
                    ))}
                  </div>
                ) : (

                  <p className=" mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow hover:shadow-lg transition text-gray-500">ไม่มีกิจกรรมที่เกี่ยวข้อง</p>
                )}
              </section>
            </div>

            {/* 💸 ขวา: การเงิน */}
              {/* 📌 นโยบาย */}
              <section>
                <h2 className="text-xl font-bold text-[#2C3E50] mb-4">📌 นโยบายที่เกี่ยวข้อง</h2>
                {policy ? (
                  <Link
                    href={`/policydetail/${encodeURIComponent(policy.id)}`}
                    className="block bg-white rounded-xl shadow-md hover:shadow-xl transition p-4 border border-gray-200"
                  >
                    <h3 className="font-semibold text-[#5D5A88] text-lg mb-1">{policy.name}</h3>
                    <p className="text-gray-700 break-words line-clamp-4 max-w-full overflow-hidden">
                      {policy.description}
                    </p>

                  </Link>
                ) : (
                  <p className="text-gray-500">ไม่มีนโยบายที่เกี่ยวข้อง</p>
                )}                  

                 {expenses.length > 0 && (
<div className="mt-6 bg-white p-4 rounded-xl shadow-md border h-96 flex flex-col">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">📋 รายการรายจ่าย</h1>

{/* เลื่อนกราฟได้เฉพาะส่วนนี้ */}
    <div className="overflow-x-auto flex-1 flex items-center">
      <div
        className="inline-block h-full pl-4"
        style={{ minWidth: `${expenses.length * 100}px` }}
      >
        <Bar
          data={barData}
          options={{
            ...barOptions,
            maintainAspectRatio: false,
          }}
       />
      </div>
    </div>
  </div>
)}

                  
             
              {pdfUrl && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow hover:shadow-lg transition">
              <h3 className="text-lg font-bold text-[#2C3E50] mb-2">📄 เอกสารอ้างอิง</h3>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5D5A88] underline hover:text-[#3e3a6d]"
              >
                🔗 เปิดเอกสารอ้างอิง
              </a>
            </div>
          )}
          </section>
            </div>
          </div>
        </div>



<section className="bg-gradient-to-br from-[#e2edfe] to-[#ffffff] py-16 bg-center bg-cover" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <h2 className="text-white text-center font-bold text-3xl mb-12 tracking-wide">แกลอรี่รูปภาพ</h2>

  <div className="max-w-7xl mx-auto px-6">
    {galleryUrls.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {galleryUrls.map((url, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl shadow-xl cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
            onClick={() => setSelectedUrl(url)}
          >
            <img
              src={url}
              alt={`รูปที่ ${idx + 1}`}
              className="w-full h-60 object-cover transition duration-500 ease-in-out group-hover:brightness-75"
            />
            
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-10 backdrop-blur-sm"></div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-center text-gray-500 text-lg">ไม่มีรูปภาพในแกลเลอรี</p>
    )}
  </div>

  {/* 🔍 Modal for expanded view */}
  {selectedUrl && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-6"
      onClick={() => setSelectedUrl(null)}
    >
      <img
        src={selectedUrl}
        alt="ขยายภาพ"
        className="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white"
      />
    </div>
  )}
</section>


        <Footer />
      </div>
   
  );
};

export default CampaignDetailPage;