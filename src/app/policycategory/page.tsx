"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart } from "lucide-react";

const categories = [
  { name: "เศรษฐกิจ", image: "/เศรษฐกิจ.jpg" },
  { name: "สังคม คุณภาพชีวิต", image: "/สังคม.jpg" },
  { name: "การเกษตร", image: "/การเกษตร.jpg" },
  { name: "สิ่งแวดล้อม", image: "/สิ่งแวดล้อม.jpg" },
  { name: "รัฐธรรมนูญ กฏหมาย", image: "/รัฐธรรมนูญ.jpg" },
  { name: "บริหารงานภาครัฐ", image: "/บริหารงานภาครัฐ.jpg" },
  { name: "การศึกษา", image: "/การศึกษา.jpg" },
  { name: "ความสัมพันธ์ระหว่างประเทศ", image: "/ความสัมพันธ์ระหว่างประเทศ.jpg" },
];

interface Policy {
  policyId: number;
  policyName: string;
  description: string;
  status: string;
  progress: number;
  partyName: string;
  categoryName: string;
  budget: number;
  uniqueKey: string;
}

const PolicyPage = () => {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [partyList, setPartyList] = useState<string[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState<string>("ทั้งหมด");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  const [likedState, setLikedState] = useState<Record<number, boolean>>({});

  const fetchPolicies = async () => {
    if (!showAll) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedParty && selectedParty !== "ทั้งหมด") {
        queryParams.append("party", selectedParty);
      }
      if (selectedStatus && selectedStatus !== "ทั้งหมด") {
        queryParams.append("status", selectedStatus);
      }

      const res = await fetch(`/api/policycategory?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log("📥 API Response:", data);

      // ตรวจสอบและแปลงข้อมูล
      const processedPolicies = data.map((p: any, idx: number) => {
        // ตรวจสอบ policyId
        let policyId: number;
        if (typeof p.policyId === 'number') {
          policyId = p.policyId;
        } else if (typeof p.policyId === 'object' && p.policyId.low) {
          policyId = p.policyId.low;
        } else {
          policyId = idx + 1000; // fallback
        }

        return {
          policyId: policyId,
          policyName: String(p.policyName || "ไม่ระบุชื่อ"),
          description: String(p.description || "ไม่มีรายละเอียด"),
          status: String(p.status || "ไม่ระบุสถานะ"),
          progress: Number(p.progress) || 0,
          partyName: String(p.partyName || "ไม่ระบุพรรค"),
          categoryName: String(p.categoryName || "ไม่ระบุหมวดหมู่"),
          budget: Number(p.budget) || 0,
          uniqueKey: `policy_${policyId}_${idx}_${Date.now()}`,
        } as Policy;
      });

      setPolicies(processedPolicies);
      console.log("✅ Processed policies:", processedPolicies.length);
      
    } catch (err) {
      console.error("❌ Error fetching policies:", err);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  // Init likedState และ fetch like count
  useEffect(() => {
    if (policies.length === 0) return;
    
    const init: Record<number, boolean> = {};
    
    policies.forEach((p) => {
      const key = `liked_${p.policyId}`;
      const stored = localStorage.getItem(key);
      init[p.policyId] = stored === "true";

      // Fetch like count
      fetch(`/api/policylike?id=${p.policyId}`)
        .then((res) => res.json())
        .then((data) => {
          const count = Number(data.like) || 0;
          setLikesMap((prev) => ({ ...prev, [p.policyId]: count }));
        })
        .catch(err => console.error("Error fetching likes:", err));
    });
    
    setLikedState(init);
  }, [policies]);

  // Toggle like
  const handleLike = async (policyId: number) => {
    const isLiked = likedState[policyId];
    const action = isLiked ? "decrement" : "increment";

    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policyId, action }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();
      const newCount = Number(data.like) || 0;
      
      setLikesMap((prev) => ({ ...prev, [policyId]: newCount }));

      const newVal = !isLiked;
      localStorage.setItem(`liked_${policyId}`, newVal.toString());
      setLikedState((prev) => ({ ...prev, [policyId]: newVal }));
      
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };

  // ดึงรายชื่อพรรค
  useEffect(() => {
    async function fetchParties() {
      try {
        const res = await fetch("/api/parties");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const data = await res.json();
        console.log("📥 Parties data:", data);
        
        // ตรวจสอบว่า data เป็น array ของ string
        const parties = Array.isArray(data) 
          ? data.filter(p => typeof p === 'string')
          : [];
          
        setPartyList(parties);
      } catch (err) {
        console.error("❌ Error fetching parties:", err);
        setPartyList([]);
      }
    }
    fetchParties();
  }, []);

  // เมื่อ filter เปลี่ยน
  useEffect(() => {
    if (showAll) {
      console.log("🔄 Fetching with filters:", { selectedParty, selectedStatus });
      fetchPolicies();
    }
  }, [selectedParty, selectedStatus, showAll]);

  // เมื่อ toggle showAll
  useEffect(() => {
    if (showAll) {
      console.log("🔄 Initial load triggered by showAll toggle");
      fetchPolicies();
    } else {
      setPolicies([]);
    }
  }, [showAll]);

  // Filter policies for display
  const filteredPolicies = policies.filter(p =>
    (selectedParty === "ทั้งหมด" || p.partyName === selectedParty) &&
    (selectedStatus === "ทั้งหมด" || p.status === selectedStatus)
  );

  console.log("🎯 Filtered policies count:", filteredPolicies.length);

  return (
    <div className="font-prompt">
      <div className="relative bg-cover bg-center" style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
        <Navbar />

        <div className="mt-10 mx-20">
          <h2 className="text-white text-[50px] font-bold">นโยบาย</h2>
        </div>

        {/* กล่องหมวดหมู่ */}
        <div className="flex justify-center">
          <div className="grid grid-cols-8 grid-rows-2 gap-6 m-10 w-[85%] items-center">
            {categories.map((category, index) => (
              <div
                key={`category-${index}-${category.name}`}
                onClick={() => router.push(`/policycategory/${encodeURIComponent(category.name)}`)}
                className="bg-white col-span-2 rounded-3xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all"
              >
                <img className="rounded-xl" src={category.image} alt={category.name} />
                <h3 className="text-center">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่ม toggle */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => {
              const toggle = !showAll;
              setShowAll(toggle);
              if (!toggle) {
                setPolicies([]);
              }
            }}
            disabled={loading}
            className="mb-4 py-3 px-8 bg-[#316599] text-white text-lg rounded-lg shadow-md hover:bg-[#254e77] hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#316599] focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? "กำลังโหลด..." : showAll ? "ซ่อนนโยบายทั้งหมด" : "ดูนโยบายทั้งหมด"}
          </button>
        </div>

        {/* แสดงผลนโยบาย */}
        {showAll && (
          <>
            {/* Filters */}
            <div className="mx-20 flex justify-end gap-6 mb-4">
              <div className="w-64">
                <select
                  value={selectedParty}
                  onChange={(e) => setSelectedParty(e.target.value)}
                  className="h-12 w-full px-4 rounded-full bg-white text-gray-800"
                  disabled={loading}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {partyList.map((party, idx) => (
                    <option key={`party-${idx}-${party}`} value={party}>
                      {party}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-64">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-12 w-full px-4 rounded-full bg-white text-gray-800"
                  disabled={loading}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  <option value="เริ่มนโยบาย">เริ่มนโยบาย</option>
                  <option value="วางแผน">วางแผน</option>
                  <option value="ตัดสินใจ">ตัดสินใจ</option>
                  <option value="ดำเนินการ">ดำเนินการ</option>
                  <option value="ประเมินผล">ประเมินผล</option>
                </select>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="text-center text-white text-xl mb-10">
                กำลังโหลดข้อมูล...
              </div>
            )}

            {/* No results message */}
            {!loading && filteredPolicies.length === 0 && policies.length > 0 && (
              <div className="text-center text-white text-xl mb-10">
                ไม่พบนโยบายตามตัวกรองที่เลือก
              </div>
            )}

            {/* Policy cards */}
            {!loading && filteredPolicies.length > 0 && (
              <div className="mx-20 pb-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredPolicies.map((policy) => {
                  const encodedPartyName = encodeURIComponent(policy.partyName);
                  const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodedPartyName}.png?alt=media`;
                  const likeCount = likesMap[policy.policyId] ?? 0;

                  return (
                    <div
                      key={policy.uniqueKey}
                      className="bg-white rounded-2xl p-5 shadow-lg relative hover:shadow-xl transition duration-300 flex flex-col justify-between cursor-pointer"
                      onClick={() => router.push(`/policydetail/${policy.policyId}`)}
                    >
                      <img
                        src={logoUrl}
                        alt={`โลโก้พรรค ${policy.partyName}`}
                        className="absolute top-4 right-4 w-10 h-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-logo.jpg";
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
                          <p><strong>งบประมาณ:</strong> {policy.budget.toLocaleString()} บาท</p>
                          <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                          <p><strong>ความคืบหน้า:</strong> {policy.progress}%</p>
                          <p><strong>สถานะ:</strong> {policy.status}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(policy.policyId);
                            }}
                            className="hover:opacity-80"
                          >
                            <Heart
                              size={20}
                              fill={likedState[policy.policyId] ? "currentColor" : "none"}
                              className={likedState[policy.policyId] ? "text-[#EF4444]" : "text-gray-400"}
                            />
                          </button>
                          <span className="text-sm text-gray-700">{likeCount}</span>
                        </div>
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
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PolicyPage;