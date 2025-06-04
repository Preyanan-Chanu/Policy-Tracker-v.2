"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import Image from "next/image";
import dynamic from "next/dynamic";

// Lazy load components
const LazyGallery = dynamic(() => import("@/app/components/LazyGallery"), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>,
  ssr: false
});

interface TimelineItem {
  date: string;
  name: string;
  description: string;
}

interface AchievementItem {
  name: string;
  description: string;
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

interface LikeState {
  count: number;
  isLiked: boolean;
  isLoading: boolean;
  hasUserLiked: boolean;
  lastLikedAt?: number;
}

const PolicyDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const policyId = decodeURIComponent(params.id as string);

  // Enhanced Like State with security measures
  const [likeState, setLikeState] = useState<LikeState>({
    count: 0,
    isLiked: false,
    isLoading: false,
    hasUserLiked: false
  });

  // Core states
  const [name, setName] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [achievement, setAchievement] = useState<{
    project?: { name: string; description: string };
    process?: { name: string; description: string };
    policy?: { name: string; description: string };
  }>({});
  const [status, setStatus] = useState<string | null>(null);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProject[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // Performance states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fingerprintCache, setFingerprintCache] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Memoized step map for better performance
  const stepMap = useMemo(() => ({
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  } as const), []);

  // Enhanced security: Get fingerprint with caching and rate limiting
  const getFingerprint = useCallback(async (): Promise<string> => {
    if (fingerprintCache) return fingerprintCache;

    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;
      setFingerprintCache(fingerprint);

      // Store in sessionStorage for this session
      sessionStorage.setItem('userFingerprint', fingerprint);
      return fingerprint;
    } catch (error) {
      console.error('Failed to get fingerprint:', error);
      // Fallback: use a combination of user agent, screen resolution, timezone
      const fallback = btoa(
        `${navigator.userAgent}-${screen.width}x${screen.height}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`
      ).substring(0, 32);
      setFingerprintCache(fallback);
      return fallback;
    }
  }, [fingerprintCache]);

  // Check if user has already liked (with local storage backup)
  const checkUserLikeStatus = useCallback(async () => {
    try {
      const fingerprint = await getFingerprint();
      const localLikeKey = `policy_like_${policyId}_${fingerprint}`;
      const hasLikedLocally = localStorage.getItem(localLikeKey) === 'true';

      if (hasLikedLocally) {
        setLikeState(prev => ({ ...prev, hasUserLiked: true, isLiked: true }));
        return true;
      }

      // Check server-side
      const res = await fetch(`/api/policylike/check?id=${policyId}&fingerprint=${fingerprint}`);
      if (res.ok) {
        const data = await res.json();
        const hasLiked = data.hasLiked;
        setLikeState(prev => ({ ...prev, hasUserLiked: hasLiked, isLiked: hasLiked }));

        if (hasLiked) {
          localStorage.setItem(localLikeKey, 'true');
        }
        return hasLiked;
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
    return false;
  }, [policyId, getFingerprint]);

  // Enhanced like handler with security measures
  const handleLike = useCallback(async () => {
  const now = Date.now();
  const lastLiked = likeState.lastLikedAt || 0;
  if (now - lastLiked < 2000 || likeState.isLoading) return;

  setLikeState(prev => ({ ...prev, isLoading: true }));

  try {
    const fingerprint = await getFingerprint();

    const res = await fetch("/api/policylike", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: Number(policyId),
        fingerprint,
        timestamp: now
      }),
    });

    if (!res.ok) {
      const msg =
        res.status === 429
          ? "กรุณารอสักครู่ก่อนกดใหม่"
          : res.status === 403
            ? "ไม่สามารถดำเนินการได้ในขณะนี้"
            : `เกิดข้อผิดพลาด (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    const newCount = typeof data.like === "number" ? data.like : Number(data.like) || 0;
    const newLikedState = !likeState.isLiked;

    setLikeState(prev => ({
      ...prev,
      count: newCount,
      isLiked: newLikedState,
      hasUserLiked: newLikedState,
      lastLikedAt: now,
      isLoading: false
    }));

    const localLikeKey = `policy_like_${policyId}_${fingerprint}`;
    if (newLikedState) {
      localStorage.setItem(localLikeKey, 'true');
    } else {
      localStorage.removeItem(localLikeKey);
    }

    if ('vibrate' in navigator) navigator.vibrate(50);
  } catch (error) {
    console.error("Like error:", error);
    setLikeState(prev => ({ ...prev, isLoading: false }));
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}, [policyId, likeState.isLiked, likeState.isLoading, likeState.lastLikedAt, getFingerprint]);


  // Optimized scroll handlers
  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }, []);

  // Wheel scroll handler with throttling
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let throttleTimer: NodeJS.Timeout | null = null;

    const onWheel = (e: WheelEvent) => {
      if (throttleTimer) return;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;

        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 16); // ~60fps
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  // Optimized data fetching with parallel requests
  useEffect(() => {
    if (!policyId) return;

    const fetchAllData = async () => {
      setIsInitialLoading(true);

      try {
        // Parallel fetch for better performance
        const [neo4jRes, likeRes] = await Promise.all([
          fetch(`/api/policydetail/${encodeURIComponent(policyId)}`),
          fetch(`/api/policylike?id=${policyId}`)
        ]);

        // Process Neo4j data
        if (neo4jRes.ok) {
          const data = await neo4jRes.json();
          setPolicyName(data.name || name);
          setDescription(data.description || "");
          setStatus(data.status || null);
          setRelatedProjects(data.relatedProjects || []);
          setParty(data.party || null);
        }

        // Process like data
        if (likeRes.ok) {
          const likeData = await likeRes.json();
          const count = typeof likeData.like === "number" ? likeData.like : Number(likeData.like) || 0;
          setLikeState(prev => ({ ...prev, count }));
        }

        // Fetch banner (non-blocking)
        fetch(`/api/banner/${policyId}`)
          .then(res => res.ok ? res.text() : Promise.reject())
          .then(setBannerUrl)
          .catch(() => console.warn("Banner not found"));

        // Check user like status
        await checkUserLikeStatus();

      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    // Initialize fingerprint cache from session storage
    const cachedFingerprint = sessionStorage.getItem('userFingerprint');
    if (cachedFingerprint) {
      setFingerprintCache(cachedFingerprint);
    }

    fetchAllData();
  }, [policyId, name, checkUserLikeStatus]);

  // Separate effect for Firebase timeline (real-time)
  useEffect(() => {
    if (!policyId) return;

    const timelineRef = collection(firestore, "Policy", policyId, "sequence");
    const unsubscribe = onSnapshot(timelineRef, (snapshot) => {
      const items: TimelineItem[] = snapshot.docs.map((doc) => doc.data() as TimelineItem);

      const sorted = items.sort((a, b) => {
        const dateA = new Date(a.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
          const thMonths: Record<string, string> = {
            "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
            "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
            "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
          };
          return `${d} ${thMonths[m] || m} ${parseInt(y) - 543}`;
        }));

        const dateB = new Date(b.date.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
          const thMonths: Record<string, string> = {
            "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
            "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
            "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
          };
          return `${d} ${thMonths[m] || m} ${parseInt(y) - 543}`;
        }));

        return dateB.getTime() - dateA.getTime();
      });

      setTimeline(sorted);
    });

    return unsubscribe;
  }, [policyId]);

  // Separate effect for achievements
  useEffect(() => {
    if (!policyId) return;

    const fetchAchievements = async () => {
      try {
        const [processSnap, policySnap, projectSnap] = await Promise.all([
          getDoc(doc(firestore, "Policy", policyId, "achievement", "เชิงกระบวนการ")),
          getDoc(doc(firestore, "Policy", policyId, "achievement", "เชิงการเมือง")),
          getDoc(doc(firestore, "Policy", policyId, "achievement", "เชิงโครงการ")),
        ]);

        setAchievement({
          process: processSnap.exists() ? processSnap.data() as { name: string; description: string } : undefined,
          policy: policySnap.exists() ? policySnap.data() as { name: string; description: string } : undefined,
          project: projectSnap.exists() ? projectSnap.data() as { name: string; description: string } : undefined,
        });
      } catch (error) {
        console.error("Achievement fetch error:", error);
      }
    };

    fetchAchievements();
  }, [policyId]);

  // Lazy load gallery images
  useEffect(() => {
    if (!policyId) return;

    const loadGallery = async () => {
      try {
        const folderRef = ref(storage, `policy/picture/${policyId}`);
        const result = await listAll(folderRef);
        const urls = await Promise.all(result.items.map(item => getDownloadURL(item)));
        setGalleryUrls(urls);
      } catch (error) {
        console.error("Gallery load error:", error);
      }
    };

    // Delay gallery loading to improve initial page load
    const timer = setTimeout(loadGallery, 1000);
    return () => clearTimeout(timer);
  }, [policyId]);

  // Show loading state
  if (isInitialLoading) {
    return (
      <div className="font-prompt min-h-screen bg-[#e2edfe] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5D5A88] mx-auto mb-4"></div>
          <p className="text-[#5D5A88]">กำลังโหลด...</p>
        </div>
      </div>
    );
  }


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
            <h1 className="text-white p-10 font-bold text-[2.5rem]">
              {policyName}
            </h1>

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
              {!showModal && description.length > 200 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-[#ffffff] mt-2 underline hover:text-gray-200 transition-colors"
                >
                  อ่านเพิ่มเติม
                </button>
              )}
            </div>

            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-md max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
                  <h2 className="text-xl font-semibold mb-4">
                    รายละเอียดนโยบายฉบับเต็ม
                  </h2>
                  <p className="text-black text-[1.2rem] whitespace-pre-wrap leading-relaxed">
                    {description}
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-4 px-4 py-2 bg-[#5D5A88] text-white rounded-md hover:bg-[#47457b] transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="row-start-3 col-start-2 col-span-2 flex justify-center items-center p-10 space-x-4">
            {typeof status === "string" && stepMap[status as keyof typeof stepMap] && (
              <Step
                step={stepMap[status as keyof typeof stepMap].step}
                label={stepMap[status as keyof typeof stepMap].label}
                bgColor={stepMap[status as keyof typeof stepMap].color}
              />
            )}


            {/* Enhanced Like Button */}
            <button
              onClick={handleLike}
              disabled={likeState.isLoading}
              className="focus:outline-none relative group transition-transform hover:scale-110 disabled:opacity-50"
              title={likeState.isLiked ? "กดเพื่อยกเลิกไลค์" : "กดเพื่อไลค์"}
            >
              <Heart
                size={26}
                fill={likeState.isLiked ? "currentColor" : "none"}
                className={`transition-colors ${likeState.isLiked
                    ? "text-[#e32222] animate-pulse"
                    : "text-gray-200 group-hover:text-pink-300"
                  }`}
              />
              {likeState.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>

            <span className="text-white text-lg font-semibold">
              {likeState.count.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Banner Section with optimized image loading */}
        <div className="relative w-full h-[35svh] overflow-hidden bg-[#5D5A88]">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt="Banner"
              fill
              className="object-cover brightness-75"
              priority
              sizes="100vw"
              onError={() => setBannerUrl("/default-banner.jpg")}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#5D5A88] to-[#47457b]"></div>
          )}

          {party && (
            <div className="absolute top-4 right-6 w-[60px] h-[60px] z-20">
              <Image
                src={`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${encodeURIComponent(party.name)}.png?alt=media`}
                alt="โลโก้พรรค"
                width={60}
                height={60}
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/default-logo.png";
                }}
              />
            </div>
          )}

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
                  className="bg-white text-[#5D5A88] px-6 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors"
                >
                  อ่านเพิ่มเติมเกี่ยวกับพรรค
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">{policyName}</h2>
                <p className="text-sm">{description}</p>
              </>
            )}
          </div>
        </div>

        <div className="w-5/6 mx-auto">
          <h2 className="text-[#2C3E50] font-bold my-10">ลำดับเหตุการณ์</h2>

          {timeline.length > 0 ? (
            <>
              {!showAllTimeline ? (
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#e2edfe] to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#e2edfe] to-transparent z-10 pointer-events-none" />

                  <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto overflow-y-hidden px-2 py-4 scrollbar-hide relative z-0"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      overflowY: "hidden",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {timeline.map((item, idx) => (
                      <div
                        key={`${item.date}-${idx}`}
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
                    <div key={`${item.date}-${idx}`} className="relative">
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

              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAllTimeline((prev) => !prev)}
                  className="bg-[#5D5A88] text-white px-5 py-2 rounded-md font-semibold hover:bg-[#47457b] transition-colors"
                >
                  {showAllTimeline ? "ดูแบบสไลด์" : "ดูทั้งหมด"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center">ไม่มีเหตุการณ์ในนโยบายนี้</p>
          )}

          <h2 className="text-[#2C3E50] font-bold my-10">ความสำเร็จ</h2>
          <div className="flex justify-center h-[300px]">
            <div className="grid grid-cols-3 gap-6 w-1/2 mt-10 mb-10 max-w-[900px] w-full">
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px] transition-shadow hover:shadow-md">
                <h3 className="text-[#2C3E50] mb-3 font-semibold">เชิงโครงการ</h3>
                <p className="text-[#2C3E50]">{achievement.project?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px] transition-shadow hover:shadow-md">
                <h3 className="text-[#2C3E50] mb-3 font-semibold">เชิงกระบวนการ</h3>
                <p className="text-[#2C3E50]">{achievement.process?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px]">
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