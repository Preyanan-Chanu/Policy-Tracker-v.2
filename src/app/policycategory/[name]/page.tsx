"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import FingerprintJS from '@fingerprintjs/fingerprintjs';


interface Policy {
  policyId: number;
  policyName: string;
  description: string;
  partyName: string;
  partyId: number;
  budget: number | null;
  categoryName: string;
  progress: number;
  status: string;
}

interface Party {
  id: number;
  name: string
}




const statuses = ["ทั้งหมด", "เริ่มนโยบาย", "วางแผน", "ตัดสินใจ", "ดำเนินการ", "ประเมินผล"];

const PolicyCategoryNamePage = () => {
  const { name } = useParams() as { name: string };
  const router = useRouter();
  const category = decodeURIComponent(name);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  const [likedState, setLikedState] = useState<Record<number, boolean>>({});
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [selectedParty, setSelectedParty] = useState("ทั้งหมด");
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedParty !== "ทั้งหมด") query.append("party", selectedParty);
      if (selectedStatus !== "ทั้งหมด") query.append("status", selectedStatus);

      const res = await fetch(`/api/policycategory/${encodeURIComponent(category)}?${query.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.message || data.error);
      }

      if (Array.isArray(data)) {
        const processedPolicies = data.map((p: any, idx: number) => {
          // ประมวลผล policyId ให้เป็น number
          let policyId: number;
          const rawId = p.policyId;

          if (typeof rawId === "number") {
            policyId = rawId;
          } else if (typeof rawId === "object" && rawId !== null && typeof rawId.low === "number") {
            policyId = rawId.low;
          } else if (typeof rawId === "string") {
            const parsed = parseInt(rawId, 10);
            policyId = isNaN(parsed) ? (idx + 1) : parsed;
          } else {
            policyId = idx + 1;
          }

          return {
            ...p,
            policyId: policyId,
          };
        });

        setPolicies(processedPolicies);
      } else {
        console.error("⚠️ Invalid API response format:", data);
        setPolicies([]);
      }
    } catch (err) {
      console.error("❌ Error fetching policies:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายชื่อพรรคการเมือง
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch("/api/parties");
        if (res.ok) {
          const data: Party[] = await res.json();
          setPartyList([{ id: 0, name: "ทั้งหมด" }, ...data]);
        }
      } catch (err) {
        console.error("❌ Error fetching party list:", err);
      }
    };
    fetchParties();
  }, []);

  // ดึงข้อมูลนโยบายเมื่อ filter เปลี่ยน
  useEffect(() => {
    fetchPolicies();
  }, [category, selectedParty, selectedStatus]);

  // จัดการข้อมูล like status และ count
  useEffect(() => {
    if (policies.length === 0) return;

    const initLikedState: Record<number, boolean> = {};
    policies.forEach((p) => {
      initLikedState[p.policyId] = false; // default false
    });
    setLikedState(initLikedState);

    const fetchLikesData = async () => {
      for (const policy of policies) {
        try {
          const res = await fetch(`/api/policylike?id=${policy.policyId}`);
          if (res.ok) {
            const data = await res.json();
            const raw = data.like;
            const count = typeof raw === "number" ? raw : (raw?.toNumber?.() ?? 0);
            setLikesMap((prev) => ({ ...prev, [policy.policyId]: count }));
          }
        } catch (err) {
          console.error(`❌ Error fetching like count for policy ${policy.policyId}:`, err);
        }
      }
    };

    fetchLikesData();
  }, [policies]);


  const handleLike = async (policyId: number) => {
    if (likedState[policyId]) return; // ป้องกันกดซ้ำฝั่ง client

    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policyId, fingerprint }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          console.warn("⛔️ Already liked.");
          return;
        }
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      const newCount = typeof data.like === "number"
        ? data.like
        : data.like?.toNumber?.() ?? 0;

      setLikesMap((prev) => ({ ...prev, [policyId]: newCount }));
      setLikedState((prev) => ({ ...prev, [policyId]: true }));

    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };

  function extractId(id: any): number {
    if (typeof id?.toNumber === "function") return id.toNumber();
    if (typeof id === "object" && typeof id.low === "number") return id.low;
    return Number(id) || 0;
  }



  return (
    <div className="font-prompt">
      <Navbar />
      <div className="px-10 py-6 bg-[#9795B5] min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <div className="flex justify-between items-center mt-6 mx-20 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/policycategory")}
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
            <h1 className="text-[2.5rem] font-bold text-white">
              นโยบายในหมวด: {category}
            </h1>
          </div>
          <div className="flex gap-3">
            <select
              className="h-12 px-4 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
            >
              {partyList.map((party, idx) => {
  const name = typeof party === "string" ? party : party.name;
  return (
    <option key={name || idx} value={name}>
      {name}
    </option>
  );
})}


            </select>
            <select
              className="h-12 px-4 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center mt-20">
            <div className="text-white text-lg">กำลังโหลดข้อมูล...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center mt-20">
            <div className="text-red-200 text-lg bg-red-900/30 px-6 py-4 rounded-lg">
              เกิดข้อผิดพลาด: {error}
            </div>
          </div>
        ) : policies.length === 0 ? (
          <div className="flex justify-center items-center mt-20">
            <div className="text-white text-lg bg-white/20 px-6 py-4 rounded-lg">
              ไม่พบนโยบายในหมวดนี้
            </div>
          </div>
        ) : (
          <div className="mx-20 pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {policies.map((policy) => {
              const partyId = extractId(policy.partyId);
              const encodedPartyName = encodeURIComponent(policy.partyName);
              const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${partyId}.png?alt=media`;

              return (
                <div
                  key={policy.policyId}
                  className="relative bg-white rounded-xl p-4 shadow-lg flex flex-col justify-between h-full hover:shadow-xl transition-shadow duration-200"
                >
                  <div>
                    <img
                      src={logoUrl}
                      alt={`โลโก้ของ ${policy.partyName}`}
                      className="absolute top-4 right-4 w-12 h-12 object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${partyId}.jpg?alt=media`;
                      }}
                    />
                    <h3 className="font-bold text-xl mb-2 pr-16">{policy.policyName}</h3>
                    <p className="mb-4 text-gray-600 line-clamp-3">{policy.description}</p>
                    <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
                      <p><strong>พรรค:</strong> {policy.partyName}</p>
                      <p><strong>งบประมาณ:</strong> {
                        policy.budget !== null
                          ? policy.budget.toLocaleString() + " บาท"
                          : "ไม่ระบุ"
                      }</p>
                      <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                      <p><strong>ความคืบหน้า:</strong> {policy.progress}%</p>
                      <p><strong>สถานะ:</strong> {policy.status}</p>
                    </div>
                  </div>

                  <div className="text-right mt-4">
                    <button
                      onClick={() => router.push(`/policydetail/${policy.policyId}`)}
                      className="text-[#5D5A88] hover:underline font-medium"
                    >
                      ดูเพิ่มเติม →
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-1">
                    <button
                      onClick={() => handleLike(policy.policyId)}
                      className="hover:opacity-75 focus:outline-none transition-opacity duration-150"
                      aria-label={likedState[policy.policyId] ? "ยกเลิกการถูกใจ" : "ถูกใจ"}
                    >
                      <Heart
                        size={20}
                        fill={likedState[policy.policyId] ? "currentColor" : "none"}
                        className={likedState[policy.policyId] ? "text-[#EF4444]" : "text-gray-400"}
                      />
                    </button>
                    <span className="font-medium text-sm">{likesMap[policy.policyId] ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PolicyCategoryNamePage;