"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { Heart } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { storage } from "@/app/lib/firebase";
import { ref, listAll, getDownloadURL } from "firebase/storage";

interface TimelineItem {
  date: string;
  name: string;
  description: string;
}

interface AchievementItem {
  name: string;
  description: string;
}

interface Achievements {
  [key: string]: AchievementItem | null;
}

interface Party {
   name: string;
    description: string;
    link?: string | null;
  }

interface RelatedProject {
  id: string;
  name: string;
  description: string;
}


const PolicyDetailPage = () => {
  const router = useRouter();
  const params = useParams();
    const policyId = decodeURIComponent(params.id   as string);
  // เพิ่ม state สำหรับเก็บชื่อ (name) ที่แปลงมาจาก id
  const [name, setName] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");

    // 2. State เก็บ like
    const [likeCount, setLikeCount] = useState<number>(0);
    const [isLiked, setIsLiked] = useState<boolean>(false);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [achievement, setAchievement] = useState<{
    project?: { name: string; description: string };
    process?: { name: string; description: string };
    policy?: { name: string; description: string };
  }>({});
  const [status, setStatus] = useState<number | null>(null); // เก็บสถานะจาก Neo4j
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepMap: Record<string, { label: string; color: string; step: number }> = {
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  };
const [relatedProjects, setRelatedProjects] = useState<RelatedProject[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");
   // เตรียม state สำหรับ URLs ของแกลเลอรี
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  // เตรียม state สำหรับ Lightbox (URL ที่ถูกคลิก)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };
  
const scrollRight = () => {
  if (scrollRef.current) {
    scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
  }
};




useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;

  const onWheel = (e: WheelEvent) => {
    // เช็คว่าเป็นการ scroll แนวตั้งหรือไม่
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  // ใช้ { passive: false } เพื่อให้สามารถเรียก preventDefault() ได้
  container.addEventListener('wheel', onWheel, { passive: false });
  
  // Clean up the event listener when the component unmounts
  return () => {
    container.removeEventListener('wheel', onWheel);
  };
}, [scrollRef.current]);





  useEffect(() => {
    console.log("✅ Status จาก Neo4j:", status);
  }, [status]);

  useEffect(() => {
    if (bannerUrl) {
      console.log("✅ bannerUrl =", bannerUrl);
    }
  }, [bannerUrl]);


  useEffect(() => {
     if (!policyId) return;
    type AchievementData = { name: string; description: string };
    
    const fetchNeo4j = async () => {
      try {
        const res = await fetch(`/api/policydetail/${encodeURIComponent(policyId)}`);
        const data = await res.json();
        setPolicyName(data.name || name);
        setDescription(data.description || "");
        setStatus(data.status || null);
        setRelatedProjects(data.relatedProjects || []); // ✅ set โครงการ
        setParty(data.party || null);

        const isLikedLocal = localStorage.getItem(`liked_policy_${policyId}`) === "true";
  setIsLiked(isLikedLocal);

 // ดึง banner URL จาก API เซิฟเวอร์
  // เรียก API /api/banner/[name] ให้ฝั่งเซิร์ฟเวอร์คืน URL ที่พร้อมใช้
 const res2 = await fetch(`/api/banner/${policyId}`);
    if (res2.ok) {
      // อ่านเป็น plain text แทน JSON
      const url = await res2.text();
      setBannerUrl(url);
    } else {
      console.warn("ไม่พบ banner ใน API /api/banner");
    }

      if (Array.isArray(data.relatedProjects)) {
          setRelatedProjects(data.relatedProjects);
        }
      } catch (error) {
        console.error("Neo4j error:", error);
      }
    };
  console.log("🎯 policyId", policyId, typeof policyId);

    
    const fetchTimeline = () => {
        const timelineRef = collection(firestore, "Policy", policyId, "sequence");
        onSnapshot(timelineRef, (snapshot) => {
          const items: TimelineItem[] = snapshot.docs.map((doc) => doc.data() as TimelineItem);
      
          // ✅ เรียงลำดับวันที่ใหม่ (จากล่าสุด -> เก่าสุด)
          const sorted = items.sort((a, b) => {
            // แปลง date string → Date object แล้วเปรียบเทียบ
            const dateA = new Date(a.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
              const thMonths = {
                "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
                "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
                "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
              };
              return `${d} ${thMonths[m as keyof typeof thMonths] || m} ${parseInt(y) - 543}`; // แปลง พ.ศ. → ค.ศ.
            }));
      
            const dateB = new Date(b.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
              const thMonths = {
                "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
                "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
                "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
              };
              return `${d} ${thMonths[m as keyof typeof thMonths] || m} ${parseInt(y) - 543}`;
            }));
      
            return dateB.getTime() - dateA.getTime(); // ✅ เรียงจากใหม่ → เก่า
          });
      
          setTimeline(sorted);
        });
      };
      
  
    const fetchAchievements = async () => {
      const processRef = doc(firestore, "Policy", policyId, "achievement", "เชิงกระบวนการ");
      const policyRef = doc(firestore, "Policy", policyId, "achievement", "เชิงการเมือง");
      const projectRef = doc(firestore, "Policy", policyId, "achievement", "เชิงโครงการ");
  
      const [processSnap, policySnap, projectSnap] = await Promise.all([
        getDoc(processRef),
        getDoc(policyRef),
        getDoc(projectRef),
      ]);
  
      setAchievement({
        process: processSnap.exists() ? (processSnap.data() as AchievementData) : undefined,
        policy: policySnap.exists() ? (policySnap.data() as AchievementData) : undefined,
        project: projectSnap.exists() ? (projectSnap.data() as AchievementData) : undefined,
      });
      
    };

    const fetchPolicy = async () => {
        const res = await fetch(`/api/policydetail/${encodeURIComponent(name)}`);
        const data = await res.json();
        setPolicyName(data.name || "name");
        setDescription(data.description || "");
        setStatus(data.status || null); // เก็บค่า status
    };

    fetchNeo4j();
    fetchTimeline();
    fetchAchievements();

     // 🔴 2. ดึงจำนวน like จาก API หลังจาก fetchNeo4j()
   fetch(`/api/policylike?id=${policyId}`)
     .then((res) => res.json())
     .then((data) => {
       const raw = data.like;
       const count = typeof raw === "number"
         ? raw
         : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
       setLikeCount(count || 0);
     });
   // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
   
   fetch(`/api/policylike?id=${policyId}`)
     .then((res) => res.json())
     .then((data) => {
       const raw = data.like;
       const count = typeof raw === "number"
         ? raw
         : (typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw));
       setLikeCount(count || 0);
     });
   // 🔴 init isLiked จาก localStorage (จะได้เก็บสถานะคนกดแต่ละเครื่อง)
   
  }, [policyId]);

  const handleLike = async () => {
    const action = isLiked ? "decrement" : "increment";
    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(policyId), action }),

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
      localStorage.setItem(`liked_policy_${policyId}`, newVal.toString());
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };

 // ดึง list ของไฟล์ในโฟลเดอร์ policy/picture/[name]

 useEffect(() => {
  console.log("🔎 Policy folder path:", `policy/picture/${policyId}`);
  const folderRef = ref(storage, `policy/picture/${policyId}`);
  listAll(folderRef)
    .then(res => {
      console.log("✅ listAll items:", res.items.map(i => i.fullPath));
      return Promise.all(res.items.map(item => getDownloadURL(item)));
    })
    .then(urls => {
      console.log("✅ Got URLs:", urls);
      setGalleryUrls(urls);
    })
    .catch(err => console.error("❌ load gallery error:", err));
}, [policyId]);


  return (
    <div className="font-prompt">
    <div className="bg-[#e2edfe]">
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


{/* ── Banner Section ── */}
<div className="relative w-full h-[35svh] overflow-hidden bg-[#5D5A88]">
  {/* Banner Image */}
  <img
    src={bannerUrl || "/default-banner.jpg"}
    alt="Banner"
    className="absolute inset-0 w-full h-full object-cover brightness-75"
  />

  {/* Logo พรรคขวาบน */}
  {party && (
    <img
      src={`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(party.name)}.png?alt=media`}
      alt="โลโก้พรรค"
      className="absolute top-4 right-6 w-[60px] h-[60px] object-contain z-20"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "/default-logo.png";
      }}
    />
  )}

  {/* Content กลางซ้าย */}
  <div className="relative z-10 flex flex-col justify-center items-start h-full px-10 text-white max-w-4xl">
    {party ? (
      <>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          นโยบายจากพรรค {party.name}
        </h2>
        <p className="text-md md:text-base mb-4 leading-relaxed max-w-2xl">
          {party.description}
        </p>
        <Link
          href={`/party/${encodeURIComponent(party.name)}`}
          className="bg-white text-[#5D5A88] px-6 py-2 rounded-md font-semibold hover:bg-gray-100"
        >
          อ่านเพิ่มเติมเกี่ยวกับพรรค
        </Link>
      </>
    ) : (
      <>
        {/* fallback ถ้าไม่มีข้อมูลพรรค */}
        <h2 className="text-2xl font-bold mb-2">{policyName}</h2>
        <p className="text-sm">{description}</p>
      </>
    )}
  </div>
</div>

      <div className="w-5/6 mx-auto">
        <h2 className="text-[#2C3E50]]  font-bold my-10">ลำดับเหตุการณ์</h2>
        {/* ✅ สร้าง State เพื่อดูว่าจะแสดงทั้งหมดไหม */}
{timeline.length > 0 ? (
    <>
      {!showAllTimeline ? (
  <div className="relative">
       <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#e2edfe] to-transparent z-10 pointer-events-none" />

         <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#e2edfe] to-transparent z-10 pointer-events-none" />


    {/* ✅ แถบ timeline scroll ได้ */}
    <div
  ref={scrollRef}
    className="flex gap-4 overflow-x-auto overflow-y-hidden px-2 py-4 scrollbar-hide relative z-0"
  style={{
    scrollbarWidth: "none",      // Firefox
    msOverflowStyle: "none",     // IE
    overflowY: "hidden",         // force again
    WebkitOverflowScrolling: "touch",
    
    
  }}
  onWheel={(e) => {
    // ดักจับ wheel event ในระดับ JSX แทนที่จะใช้ useEffect
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }}
>
  {timeline.map((item, idx) => (
    <div
      key={idx}
      className="min-w-[220px] max-w-[400px] bg-white border border-gray-200 rounded-lg px-4 py-3 flex-shrink-0 shadow hover:shadow-md transition relative"
    >
      <div className="w-3 h-3 bg-[#5D5A88] rounded-full absolute -left-1 top-4 border-2 border-white"></div>
      <h3 className="text-md font-bold text-[#5D5A88] mb-1">{item.name}</h3>
      <p className="text-sm text-gray-500 mb-2">{item.date}</p>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  ))}
</div>
  </div>
) : (
        <div className="relative border-l-4 border-[#5D5A88] pl-6 mt-4 space-y-6">
          {timeline.map((item, idx) => (
            <div key={idx} className="relative">
              {/* จุดกลม */}
              <div className="absolute -left-[14px] top-1 w-3 h-3 bg-[#5D5A88] rounded-full border-2 border-white"></div>
              <div className="bg-white p-4 rounded-md shadow-md">
                <h3 className="text-md font-bold text-[#5D5A88]">{item.name}</h3>
                <p className="text-sm text-gray-400">{item.date}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ปุ่ม toggle */}
      <div className="text-center mt-6">
        <button
          onClick={() => setShowAllTimeline((prev) => !prev)}
          className="bg-[#5D5A88] text-white px-5 py-2 rounded-md font-semibold hover:bg-[#47457b]"
        >
          {showAllTimeline ? "ดูแบบสไลด์" : "ดูทั้งหมด"}
        </button>
      </div>
    </>
  ) : (
    <p className="text-gray-500 text-center">ไม่มีเหตุการณ์ในนโยบายนี้</p>
  )}

        <h2 className="text-[#2C3E50]]  font-bold my-10">ความสำเร็จ</h2>
        <div className="flex justify-center h-[300px]">
        <div className="grid grid-cols-3 gap-6 w-1/2 mt-10 mb-10 max-w-[900px] w-full">
        <div className="border border-gray-300  bg-white rounded-xl p-4 text-center max-w-[300px]">
            <h3 className="text-[#2C3E50] mb-3">เชิงโครงการ</h3>
            <p className="text-[#2C3E50]">{achievement.project?.description || "-"}</p>
        </div>
        <div className="border border-gray-300  bg-white rounded-xl p-4 text-center max-w-[300px]">
            <h3 className="text-[#2C3E50] mb-3">เชิงกระบวนการ</h3>
            <p className="text-[#2C3E50]">{achievement.process?.description || "-"}</p>
        </div>
        <div className="border border-gray-300  bg-white rounded-xl p-4 text-center max-w-[300px]">
            <h3 className="text-[#2C3E50] mb-3">เชิงนโยบาย</h3>
            <p className="text-[#2C3E50]">{achievement.policy?.description || "-"}</p>
        </div>
        </div>
        </div>


<h2 className="text-[#2C3E50] font-bold my-10">โครงการที่เกี่ยวข้อง</h2>

{relatedProjects.filter(p => p.name?.trim()).length > 0 ? (
  <div className="grid grid-cols-2 gap-6 mt-4 mb-20">
    {relatedProjects
      .filter((project) => project.name?.trim()) // ✅ กรอง name ที่ว่าง/null
      .map((project) => (
        <Link
          key={project.name}
          href={`/campaigndetail/${encodeURIComponent(project.id)}`}
          className="no-underline"
        >
          <div className="border border-gray-300 bg-white rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
            <h3 className="text-[#2C3E50] mb-2">{project.name}</h3>
            <p className="text-[#2C3E50]">{project.description}</p>
          </div>
        </Link>
      ))}
  </div>
) : (
  <div className="mb-20">
    <p className="text-[#2C3E50] text-center py-10">
      ไม่มีโครงการที่เกี่ยวข้อง
    </p>
  </div>
)}


        
      </div>
      
    <h2 className="text-[#2C3E50] text-center font-bold my-10">แกลอรี่รูปภาพ</h2>
 <section className="bg-white py-12">
  <div className="max-w-6xl mx-auto px-4">

    {/* Masonry columns */}
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
      {galleryUrls.length > 0 ? (
        galleryUrls.map((url, idx) => (
          <div
            key={idx}
            className="relative break-inside-avoid mb-4 overflow-hidden rounded-xl shadow-lg group cursor-pointer"
            onClick={() => setSelectedUrl(url)}
          >
            <img
              src={url}
              alt={`รูปที่ ${idx + 1}`}
              className="w-full transition-transform duration-300 group-hover:scale-105"
            />
            {/* Overlay ด้านบนภาพ */}
            <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm text-white">รูปที่ {idx + 1}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500">ไม่มีรูปภาพในแกลเลอรี</p>
      )}
    </div>
  </div>

  {/* Lightbox */}
  {selectedUrl && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
      onClick={() => setSelectedUrl(null)}
    >
      <img
        src={selectedUrl}
        alt="ขยายภาพ"
        className="max-w-full max-h-full rounded-lg shadow-2xl"
      />
    </div>
  )}
</section>


      <Footer />
    </div>
    </div>
  );
};

export default PolicyDetailPage;