"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Heart } from "lucide-react";

interface Policy {
  policyName: string;
  description: string;
  partyName: string;
  budget: string | number;
  categoryName: string;
  progress: string;
  status: string;
}

const statuses = ["ทั้งหมด", "เริ่มนโยบาย", "วางแผน", "ตัดสินใจ", "ดำเนินการ", "ประเมินผล"];

const PolicyCategoryNamePage = () => {
  const { name } = useParams() as { name: string };
  const router = useRouter();
  const category = decodeURIComponent(name);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedState, setLikedState] = useState<Record<string, boolean>>({});

  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [selectedParty, setSelectedParty] = useState("ทั้งหมด");
  const [partyList, setPartyList] = useState<string[]>([]);

  // ดึง policy จาก API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/policycategory/${encodeURIComponent(category)}`);
        const data: Policy[] = await res.json();
        setPolicies(data || []);
        const uniqueParties = Array.from(new Set(data.map(p => p.partyName || "ไม่ระบุพรรค")));
        setPartyList(["ทั้งหมด", ...uniqueParties]);
      } catch (err) {
        console.error("❌ Error fetching policies:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  // ดึงจำนวน like จาก API
  useEffect(() => {
    const init: Record<string, boolean> = {};
    policies.forEach((p) => {
      init[p.policyName] = localStorage.getItem(`liked_${p.policyName}`) === "true";

      fetch(`/api/policylike?name=${encodeURIComponent(p.policyName)}`)
        .then((res) => res.json())
        .then((data) => {
          const raw = data.like;
          const count = typeof raw === "number"
            ? raw
            : typeof raw?.toNumber === "function"
            ? raw.toNumber()
            : Number(raw) || 0;
          setLikesMap((m) => ({ ...m, [p.policyName]: count }));
        })
        .catch((err) => console.error("❌ fetch like error:", err));
    });
    setLikedState(init);
  }, [policies]);

  const handleLike = async (policyName: string) => {
    const isLiked = likedState[policyName];
    const action = isLiked ? "decrement" : "increment";

    try {
      const res = await fetch("/api/policylike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: policyName, action }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const raw = data.like;
      const newCount = typeof raw === "number"
        ? raw
        : typeof raw?.toNumber === "function"
        ? raw.toNumber()
        : Number(raw) || 0;

      setLikesMap((m) => ({ ...m, [policyName]: newCount }));
      const newVal = !isLiked;
      localStorage.setItem(`liked_${policyName}`, newVal.toString());
      setLikedState((s) => ({ ...s, [policyName]: newVal }));
    } catch (err) {
      console.error("❌ handleLike error:", err);
    }
  };

  return (
    <div className="font-prompt">
      <Navbar />
      <div className="px-10 py-6 bg-[#9795B5] min-h-screen">
        <div className="flex justify-between items-center mt-6 mx-20 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/policycategory")}
              className="bg-white text-[#5D5A88] px-4 py-2 rounded-full shadow hover:bg-[#e5e5f7] transition"
            >
              &larr; กลับ
            </button>
            <h1 className="text-[2.5rem] font-bold text-white">
              นโยบายในหมวด: {category}
            </h1>
          </div>
          <div className="flex gap-3">
            <select
              className="h-12 px-4 rounded-full text-gray-700"
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
            >
              {partyList.map((party) => (
                <option key={party} value={party}>{party}</option>
              ))}
            </select>
            <select
              className="h-12 px-4 rounded-full text-gray-700"
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
          <p className="text-gray-200 text-center mt-10">กำลังโหลด...</p>
        ) : policies.length === 0 ? (
          <p className="text-white text-center mt-10">ไม่พบนโยบายในหมวดนี้</p>
        ) : (
          <div className="mx-20 pb-10 grid grid-cols-3 gap-6">
            {policies
              .filter((policy) =>
                (selectedParty === "ทั้งหมด" || policy.partyName === selectedParty) &&
                (selectedStatus === "ทั้งหมด" || policy.status === selectedStatus)
              )
              .map((policy, idx) => {
                const encodedPartyName = encodeURIComponent(policy.partyName);
                const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodedPartyName}.png?alt=media`;

                return (
                  <div key={idx} className="relative bg-white rounded-xl p-4 shadow-lg flex flex-col justify-between h-full">
                    <div>
                      <img
                        src={logoUrl}
                        alt={`โลโก้ของ ${policy.partyName}`}
                        className="absolute top-4 right-4 w-12 h-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-logo.jpg";
                        }}
                      />
                      <h3 className="font-bold text-xl mb-2">{policy.policyName}</h3>
                      <p className="mb-2">{policy.description}</p>
                      <div className="grid grid-cols-2 gap-2 mt-6">
                        <p><strong>พรรค:</strong> {policy.partyName}</p>
                        <p><strong>งบประมาณ:</strong> {policy.budget}</p>
                        <p><strong>หมวดหมู่:</strong> {policy.categoryName}</p>
                        <p><strong>ความคืบหน้า:</strong> {policy.progress}</p>
                        <p><strong>สถานะ:</strong> {policy.status}</p>
                      </div>
                    </div>

                    <div className="text-right mt-4">
                      <button
                        onClick={() =>
                          router.push(`/policydetail/${encodeURIComponent(policy.policyName)}`)
                        }
                        className="text-[#5D5A88] hover:underline"
                      >
                        ดูเพิ่มเติม →
                      </button>
                    </div>

                    <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-1">
                      <button
                        onClick={() => handleLike(policy.policyName)}
                        className="hover:opacity-75 focus:outline-none"
                      >
                        <Heart
                          size={20}
                          fill={likedState[policy.policyName] ? "currentColor" : "none"}
                          className={likedState[policy.policyName] ? "text-[#EF4444]" : "text-gray-400"}
                        />
                      </button>
                      <span className="font-medium">{likesMap[policy.policyName] ?? 0}</span>
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
