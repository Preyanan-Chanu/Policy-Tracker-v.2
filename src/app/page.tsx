"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { firestore } from "@/app/lib/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import Step from "@/app/components/step";
import { useRouter } from "next/navigation";


  interface Policy {
    name: string;
    description: string;
    partyName: string;
  }
  
  interface Category {
    name: string;
    policies: Policy[];
  }

  // --- เพิ่ม state เพื่อเก็บนโยบายยอดนิยม ---
  interface PopularPolicy { policyName: string; likeCount: number; }

  interface RecentPolicy { policyName: string; updatedAt: string; }

  
  export default function HomePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [popularPolicies, setPopularPolicies] = useState<PopularPolicy[]>([]);
    const prevCard = () => {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    };
    
  const [policies, setPolicies] = useState<any[]>([]);
  
  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/policy");
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      console.error("Error fetching policies:", err);
    }
  };

  const [latestPolicies, setLatestPolicies] = useState<PopularPolicy[]>([]);

useEffect(() => {
  async function fetchLatest() {
    const res = await fetch("/api/policy");
    const all: any[] = await res.json();
    setLatestPolicies(all.slice(-5).reverse());
  }
  fetchLatest();
}, []);

  // ← เพิ่มตรงนี้เพื่อดึงข้อมูลทุกครั้งที่หน้าโหลด
  useEffect(() => {
    fetchPolicies();
  }, []);

    const nextCard = () => {
      setCurrentIndex(prev =>
        Math.min(prev + 1, categories.length - 2)
      );
    };
    const stepMap: Record<string, { label: string; color: string; step: number }> = {
      "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
      "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
      "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
      "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
      "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
    };
  
    const visibleCards = categories.slice(currentIndex, currentIndex + 2);

    
  
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          const res = await fetch("/api/home");
          const data = await res.json();
          setCategories(data);
        } catch (err) {
          console.error("❌ Failed to fetch categories:", err);
        }
      };
  
      fetchCategories();
    }, []);

    // --- ดึง 5 อันดับนโยบายจาก API และจัดเรียงตาม likeCount ---
  useEffect(() => {
      async function fetchPopular() {
        try {
          const res = await fetch("/api/policy");
          const all: any[] = await res.json();
          const withLikes = await Promise.all(
            all.map(async (p) => {
              const r = await fetch(
                `/api/policylike?name=${encodeURIComponent(p.policyName)}`
              );
             const { like } = await r.json();
              return {
                policyName: p.policyName,
                likeCount: Number(like) || 0,
              };
           })
          );
          setPopularPolicies(
            withLikes.sort((a, b) => b.likeCount - a.likeCount).slice(0, 5)
          );
        } catch (e) {
          console.error("❌ fetch popular error:", e);
        }
     }
      fetchPopular();
    }, []);

    const [recentPolicies, setRecentPolicies] = useState<RecentPolicy[]>([]);

  // ดึงนโยบายทั้งหมด แล้วเรียงตาม updatedAt (ล่าสุดก่อน) → เก็บแค่ 5 รายการแรก
  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/policy");
        const all: any[] = await res.json();
        const sorted = all
          .filter(p => p.updatedAt)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map(p => ({ policyName: p.policyName, updatedAt: p.updatedAt }));
        setRecentPolicies(sorted);
      } catch (err) {
        console.error("❌ fetch recent error:", err);
      }
    }
    fetchRecent();
  }, []);


  return (
    <div
      className="font-prompt relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}
    >
      <Navbar />
        {/* เอา bg-white ออก ให้ main ไม่มี padding */}
      <main className="w-full m-0 p-0">
        {/* section นี้กำหนด bg เป็นสีเดียวกับ wrapper */}
      <section className="w-full m-0 p-10 ">
        <iframe
          title="หน้าหลัก"
          className="w-full h-[90vh] border-0 block"
          src={
            "https://app.powerbi.com/reportEmbed?" +
            "reportId=80eb8db3-cdc4-4146-b2df-354a276532a3" +
            "&autoAuth=true" +
            "&ctid=0a43deb9-efb0-4f46-8594-71899230fda6" +
            "&actionBarEnabled=false" +        // ปิดแถบเมนูบน
            "&filterPaneEnabled=false" +       // ปิดแผงกรอง
            "&navContentPaneEnabled=false" +   // ปิดแผงเนวิเกชัน
            "&pageView=fitToWidth"             // ปรับให้เต็มความกว้าง
          }
          frameBorder="0"
          allowFullScreen
        />
      </section>

{/* Example Section */}
<section className="example-container bg-white shadow-md p-6 mb-6 h-[700px]">
  <h2 className="text-3xl font-semibold mt-4 text-[#5D5A88] mb-4 text-center">
    สัญลักษณ์แทนขั้นความคืบหน้า
  </h2>
  
  <div className="example-content-1 flex items-center justify-center mb-8">
    {/* สัญลักษณ์ */}
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {Object.values(stepMap).map((stepObj, idx) => (
        <Step
          key={idx}
          step={stepObj.step}
          label={stepObj.label}
          bgColor={stepObj.color}
        />
      ))}
    </div>
  </div>
  
  <h2 className="text-3xl font-semibold text-[#5D5A88] mt-4 mb-4 text-center">
            ตัวอย่างนโยบายต่างๆแบ่งตามหมวดหมู่
    </h2>
  <div className="example-content-2 flex items-center justify-center space-x-20">
      <button
      onClick={prevCard}
      className="text-[48px] font-light text-[#5D5A88] hover:text-[#3f3c62] transition-transform hover:scale-110"
    >
      {"<"}
    </button>


    <div className="flex space-x-10 mt-4">
      {visibleCards.map((category, idx) => (
        <div
          key={idx}
          className=" w-[600px] h-[350px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88] p-4 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-2xl font-bold mb-4 text-[#5D5A88]">
              {category.name}
              <span className="text-xl text-gray-400 ml-2 font-normal">
                (มีทั้งหมด {category.policies.length} นโยบาย)
            </span>
            </h3>
            <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
            {category.policies.slice(0, 5).map((p, i) => {
                const encodedPartyName = encodeURIComponent(p.partyName);
                const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodedPartyName}.png?alt=media`;

                return (
                <li key={i} className="flex justify-between items-center border-b pb-1">
                    <span className="truncate">{p.name}</span>
                    <img
                    src={logoUrl}
                    alt={`โลโก้ของ ${p.partyName}`}
                    className="w-6 h-6 object-contain ml-3"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-logo.jpg";
                    }}
                    />
                </li>
                );
            })}
            </ul>
          </div>

          <div className="text-right mt-2 mb-4">
            <Link
              href={`/policycategory/${encodeURIComponent(category.name)}`}
              className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]"
            >
              ดูเพิ่มเติม &rarr;
            </Link>
          </div>
        </div>
      ))}
    </div>

    <button
      onClick={nextCard}
      className="text-[48px] font-light text-[#5D5A88] hover:text-[#3f3c62] transition-transform hover:scale-110"
    >
      {">"}
    </button>
  </div>
</section>



{/* Popular Section */}
<section className="popular-container p-6 mb-8">
  <h2 className="text-3xl font-semibold text-[#ffffff] mb-4 text-center">
    นโยบายที่ได้รับความสนใจสูงสุด
  </h2>
  <div className="flex space-x-10 mt-10 justify-center">

        {/* Left card: แสดง 5 นโยบายยอดนิยม */}
        <div className="card2 w-[610px] h-[340px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88] p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-2xl font-bold mb-4 text-[#5D5A88]">
          นโยบายที่ได้รับความสนใจสูงสุด
        </h3>
        <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
          {popularPolicies.slice(0, 5).map((p) => (
            <li key={p.policyName} className="flex justify-between items-center border-b pb-1">
              <span className="truncate">{p.policyName}</span>
              <span>👍 {p.likeCount}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-right mt-2">
        <Link
          href={`/policy`}
          className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]"
        >
          ดูเพิ่มเติม &rarr;
        </Link>
      </div>
    </div>


      {/* Right card: แสดง 5 นโยบายล่าสุด */}
    <div className="card2 w-[610px] h-[340px] bg-white shadow-md rounded-xl border-2 border-[#5D5A88] p-4 flex flex-col justify-between transition-transform hover:scale-105">
      <h3 className="text-2xl font-bold mb-4 text-[#5D5A88] ">
        นโยบายใหม่ล่าสุด
      </h3>
      <ul className="list-none pl-0 text-xl text-left text-[#3f3c62] space-y-2">
        {latestPolicies.slice(0, 5).map((p) => (
          <li key={p.policyName} className="border-b pb-1 truncate">
            {p.policyName}
          </li>
        ))}
      </ul>
      <div className="text-right mt-2">
        <Link
          href="/policy"
          className="text-sm text-[#5D5A88] underline hover:text-[#3f3c62]"
        >
          ดูเพิ่มเติม &rarr;
        </Link>
      </div>
    </div>
  </div>

</section>


      </main>
      <Footer />
    </div>
  );
}