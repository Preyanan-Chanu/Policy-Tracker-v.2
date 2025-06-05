//src\app\policycategory\[name]\page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart, ArrowLeft, AlertCircle } from "lucide-react";
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
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<Record<number, boolean>>({});
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [selectedParty, setSelectedParty] = useState("ทั้งหมด");
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Enhanced fingerprint loading with error handling
  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        console.log("📌 Fingerprint loaded:", result.visitorId);
        setFingerprint(result.visitorId);
      } catch (error) {
        console.error("❌ Error loading fingerprint:", error);
        // Fallback to a basic browser fingerprint
        const fallbackFingerprint = btoa(
          navigator.userAgent +
          screen.width +
          screen.height +
          new Date().getTimezoneOffset()
        ).substring(0, 16);
        setFingerprint(fallbackFingerprint);
      }
    };
    loadFingerprint();
  }, []);

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

  useEffect(() => {
    fetchPolicies();
  }, [category, selectedParty, selectedStatus]);

  // Enhanced like state initialization - same as main policycategory page
  useEffect(() => {
    if (policies.length === 0 || !fingerprint) return;

    const fetchLikeStates = async () => {
      const promises = policies.map(async (p) => {
        try {
          const res = await fetch(`/api/policylike?id=${p.policyId}&fingerprint=${fingerprint}`);
          if (!res.ok) {
            console.warn(`Failed to fetch like state for policy ${p.policyId}`);
            return { policyId: p.policyId, count: 0, liked: false };
          }

          const data = await res.json();
          const count = Number(data.like) || 0;
          const liked = Boolean(data.isLiked);

          return { policyId: p.policyId, count, liked };
        } catch (error) {
          console.error(`Error fetching like state for policy ${p.policyId}:`, error);
          return { policyId: p.policyId, count: 0, liked: false };
        }
      });

      const results = await Promise.all(promises);

      const newLikesMap: Record<number, number> = {};
      const newLikedState: Record<number, boolean> = {};

      results.forEach(({ policyId, count, liked }) => {
        newLikesMap[policyId] = count;
        newLikedState[policyId] = liked;
      });

      setLikesMap(newLikesMap);
      setLikedState(newLikedState);
    };

    fetchLikeStates();
  }, [policies, fingerprint]);

  // Enhanced like handler with better error handling - same as main policycategory page
  const handleLike = async (policyId: number) => {
    const pid = Number(policyId);
    console.log("🖱️ กดไลก์ policy:", pid);

    if (!fingerprint) {
      setErrorMessage("ระบบกำลังโหลด กรุณารอสักครู่");
      return;
    }

    if (isLiking[pid]) {
      console.warn("⚠️ กำลังประมวลผลอยู่");
      return;
    }

    setIsLiking(prev => ({ ...prev, [pid]: true }));
    setErrorMessage("");

    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pid, fingerprint }),
      });

      const data = await res.json();

      if (!res.ok) {
        switch (res.status) {
          case 403:
            if (data.error.includes("network")) {
              setErrorMessage("มีการกดไลค์นโยบายนี้จากเครือข่ายนี้แล้ว");
            } else if (data.error.includes("Suspicious")) {
              setErrorMessage("ตรวจพบการใช้งานที่ผิดปกติ กรุณาลองใหม่ในภายหลัง");
            } else {
              setErrorMessage("ไม่สามารถกดไลก์ได้ในขณะนี้");
            }
            break;
          case 429:
            setErrorMessage("กดไลก์บ่อยเกินไป กรุณารอสักครู่");
            break;
          default:
            setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
        return;
      }

      const newCount = Number(data.like) || 0;
      const action = data.action;

      setLikesMap(prev => ({ ...prev, [pid]: newCount }));
      setLikedState(prev => ({ ...prev, [pid]: action === "liked" }));

      console.log(`✅ ${action} policy ${pid}, new count: ${newCount}`);
    } catch (error) {
      console.error("❌ handleLike error:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      console.log("🧹 Reset isLiking for:", pid);
      setIsLiking(prev => ({ ...prev, [pid]: false }));

      setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    }
  };

  function extractId(id: any): number {
    if (typeof id?.toNumber === "function") return id.toNumber();
    if (typeof id === "object" && typeof id.low === "number") return id.low;
    return Number(id) || 0;
  }

  // Enhanced Like Button Component - same style as main policycategory page
  const LikeButton = ({
    policyId,
    isLiked,
    isProcessing,
    count,
    onLike,
  }: {
    policyId: number;
    isLiked: boolean;
    isProcessing: boolean;
    count: number;
    onLike: (id: number) => void;
  }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onLike(policyId);
      }}
      disabled={isProcessing}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
        ${isLiked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Heart size={20} className={isLiked ? 'fill-current' : ''} />
      <span className="font-medium">
        {isProcessing ? '...' : count}
      </span>
      {isProcessing && (
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      )}
    </button>
  );

  return (
    <div className="font-prompt">
      <div className="relative bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <Navbar />
        
        <div className="px-10 py-6 min-h-screen">
          {/* Header with back button and title */}
          <div className="flex justify-between items-center mt-6 mx-20 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/policycategory")}
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#2C3E50] font-medium rounded-full shadow-md hover:shadow-lg hover:!bg-[#316599] hover:!text-white transform hover:-translate-y-0.5 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5D5A88]/50"
              >
                <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
              <h1 className="text-[2.5rem] font-bold text-white">นโยบายในหมวด: {category}</h1>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <select
                className="h-12 px-4 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                disabled={loading}
              >
                {partyList.map((party, idx) => {
                  const name = typeof party === "string" ? party : party.name;
                  return (
                    <option key={name || idx} value={name}>{name}</option>
                  );
                })}
              </select>
              <select
                className="h-12 px-4 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={loading}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mx-20 mb-4 flex items-center gap-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center mt-20 text-white text-lg">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังโหลดข้อมูล...
              </div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center mt-20 text-red-200 text-lg bg-red-900/30 px-6 py-4 rounded-lg mx-20">
              <AlertCircle size={24} className="mr-2" />
              เกิดข้อผิดพลาด: {error}
            </div>
          ) : policies.length === 0 ? (
            <div className="flex justify-center items-center mt-20 text-white text-lg bg-white/20 px-6 py-4 rounded-lg mx-20">
              ไม่พบนโยบายในหมวดนี้
            </div>
          ) : (
            /* Policy Cards - Updated layout to match main policycategory page */
            <div className="mx-20 pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {policies.map((policy) => {
                const partyId = extractId(policy.partyId);
                const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${partyId}.png?alt=media`;
                const likeCount = likesMap[policy.policyId] ?? 0;

                return (
                  <div
                    key={policy.policyId}
                    className="bg-white rounded-2xl p-5 shadow-lg relative hover:shadow-xl transition duration-300 flex flex-col justify-between cursor-pointer"
                    onClick={() => router.push(`/policydetail/${policy.policyId}`)}
                  >
                    <img
                      src={logoUrl}
                      alt={`โลโก้พรรค ${policy.partyName}`}
                      className="absolute top-4 right-4 w-10 h-10 object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${partyId}.jpg?alt=media`;
                      }}
                    />

                    <div>
                      <p className="text-lg font-bold text-[#5D5A88] mb-2">
                        {policy.policyName}
                      </p>
                      <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                        {policy.description}
                      </p>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-y-1">
                        <p><strong>พรรค:</strong> {policy.partyName}</p>
                        <p><strong>งบประมาณ:</strong> {policy.budget !== null ? policy.budget.toLocaleString() + " บาท" : "ไม่ระบุ"}</p>
                        <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                        <p><strong>ความคืบหน้า:</strong> {policy.progress}%</p>
                        <p><strong>สถานะ:</strong> {policy.status}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <LikeButton
                        policyId={policy.policyId}
                        isLiked={likedState[policy.policyId] || false}
                        isProcessing={isLiking[policy.policyId] || false}
                        count={likesMap[policy.policyId] || 0}
                        onLike={handleLike}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/policydetail/${policy.policyId}`);
                        }}
                        className="text-sm text-[#5D5A88] hover:underline"
                      >
                        ดูเพิ่มเติม →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PolicyCategoryNamePage;