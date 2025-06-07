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


// Lazy load Gallery with better loading state
const LazyGallery = dynamic(() => import("@/app/components/LazyGallery"), {
  loading: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
      ))}
    </div>
  ),
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
  id: string;
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

interface GalleryImage {
  url: string;
  loaded: boolean;
  error: boolean;
}

const LIKE_COOLDOWN = 2000; // 2 seconds
const GALLERY_BATCH_SIZE = 6;
const INTERSECTION_THRESHOLD = 0.1;

const PolicyDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const policyId = decodeURIComponent(params.id as string);
    const [pdfUrl, setPdfUrl] = useState<string>("");

  // Enhanced Like State with better security
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

  // Optimized Gallery states
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(GALLERY_BATCH_SIZE);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Performance states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fingerprintCache, setFingerprintCache] = useState<string | null>(null);
  const [likeAttempts, setLikeAttempts] = useState<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const galleryObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Memoized step map
  const stepMap = useMemo(() => ({
    "เริ่มนโยบาย": { label: "เริ่มนโยบาย", color: "#DF4F4D", step: 1 },
    "วางแผน": { label: "วางแผน", color: "#F29345", step: 2 },
    "ตัดสินใจ": { label: "ตัดสินใจ", color: "#F97316", step: 3 },
    "ดำเนินการ": { label: "ดำเนินการ", color: "#64C2C7", step: 4 },
    "ประเมินผล": { label: "ประเมินผล", color: "#33828D", step: 5 },
  } as const), []);

  // Enhanced fingerprint with better caching
  const getFingerprint = useCallback(async (): Promise<string> => {
    if (fingerprintCache) return fingerprintCache;

    // Check session storage first
    const sessionFingerprint = sessionStorage.getItem('userFingerprint');
    if (sessionFingerprint) {
      setFingerprintCache(sessionFingerprint);
      return sessionFingerprint;
    }

    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      setFingerprintCache(fingerprint);
      sessionStorage.setItem('userFingerprint', fingerprint);
      return fingerprint;
    } catch (error) {
      console.error('Failed to get fingerprint:', error);
      const fallback = btoa(
        `${navigator.userAgent}-${screen.width}x${screen.height}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`
      ).substring(0, 32);
      setFingerprintCache(fallback);
      sessionStorage.setItem('userFingerprint', fallback);
      return fallback;
    }
  }, [fingerprintCache]);

  // Rate limiting check
  const checkRateLimit = useCallback((timestamp: number): boolean => {
    const now = Date.now();
    const recentAttempts = likeAttempts.filter(time => now - time < 10000); // 10 seconds window

    if (recentAttempts.length >= 3) {
      return false;
    }

    setLikeAttempts(prev => [...prev.slice(-2), timestamp]);
    return true;
  }, [likeAttempts]);

  // Enhanced like status check with better caching
  const checkUserLikeStatus = useCallback(async () => {
  if (!policyId) {
    console.warn("⚠️ policyId is undefined, skipping like check.");
    return;
  }

  try {
    const fingerprint = await getFingerprint();
    const localKey = `policy_like_${policyId}_${fingerprint}`;

    const res = await fetch(`/api/policylike?id=${policyId}&fingerprint=${fingerprint}`);
    const data = await res.json().catch(() => ({}));

    console.log("📥 Like status response:", res.status, data);

    if (!res.ok) throw new Error("Fetch failed");

    const hasLiked = Boolean(data.isLiked);
    const likeCount = Number(data.like) || 0;

    // ✅ update state
    setLikeState(prev => ({
      ...prev,
      hasUserLiked: hasLiked,
      isLiked: hasLiked,
      count: likeCount
    }));

    // ✅ update localStorage หลังจากรู้ผลจริง
    if (hasLiked) {
      localStorage.setItem(localKey, 'true');
    } else {
      localStorage.removeItem(localKey);
    }

  } catch (err) {
    console.error("❌ checkUserLikeStatus error:", err);
  }
}, [policyId, getFingerprint]);




  // Enhanced like handler with better security
  const handleLike = useCallback(async () => {
  const now = Date.now();

  // ป้องกันการกดซ้ำเร็วเกิน
  const lastLiked = likeState.lastLikedAt || 0;
  if (now - lastLiked < LIKE_COOLDOWN) {
    alert(`กรุณารอ ${Math.ceil((LIKE_COOLDOWN - (now - lastLiked)) / 1000)} วินาที`);
    return;
  }

  // Rate limit (ใน client)
  if (!checkRateLimit(now)) {
    alert("คุณกดไลค์บ่อยเกินไป กรุณารอสักครู่");
    return;
  }

  if (likeState.isLoading) return;

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
      const errorData = await res.json().catch(() => ({}));
      const msg = res.status === 429
        ? "กรุณารอสักครู่ก่อนกดใหม่"
        : res.status === 403
          ? errorData.error || "ไม่สามารถดำเนินการได้ในขณะนี้"
          : `เกิดข้อผิดพลาด (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    const newCount = typeof data.like === "number" ? data.like : Number(data.like) || 0;
    const newLikedState = data.action === 'liked'; // ✅ เช็คจากฝั่ง server โดยตรง
    const localLikeKey = `policy_like_${policyId}_${fingerprint}`;

    // อัปเดตสถานะไลค์
    setLikeState(prev => ({
      ...prev,
      count: newCount,
      isLiked: newLikedState,
      hasUserLiked: newLikedState,
      lastLikedAt: now,
      isLoading: false
    }));

    // อัปเดต localStorage ให้ตรงกับสถานะจริง
    if (newLikedState) {
      localStorage.setItem(localLikeKey, 'true');
    } else {
      localStorage.removeItem(localLikeKey);
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(newLikedState ? [50, 30, 50] : [30]);
    }

    // Visual feedback (bounce)
    const button = document.querySelector('[data-like-button]');
    if (button) {
      button.classList.add('animate-bounce');
      setTimeout(() => button.classList.remove('animate-bounce'), 500);
    }

  } catch (error) {
    console.error("❌ Like error:", error);
    setLikeState(prev => ({ ...prev, isLoading: false }));
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}, [policyId, likeState.isLoading, likeState.lastLikedAt, getFingerprint, checkRateLimit]);


  // Optimized scroll handlers
  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }, []);

  // Optimized wheel scroll handler
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let throttleTimer: number | null = null;

    const onWheel = (e: WheelEvent) => {
      if (throttleTimer) return;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;

        throttleTimer = window.setTimeout(() => {
          throttleTimer = null;
        }, 16);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  // Optimized gallery loading with intersection observer
  const loadGalleryImages = useCallback(async () => {
    if (galleryLoading) return;

    setGalleryLoading(true);
    try {
      const folderRef = ref(storage, `policy/picture/${policyId}`);
      const result = await listAll(folderRef);

      const imagePromises = result.items.map(async (item) => {
        try {
          const url = await getDownloadURL(item);
          return { url, loaded: false, error: false };
        } catch (error) {
          console.error(`Failed to load image ${item.name}:`, error);
          return null;
        }
      });

      const images = (await Promise.all(imagePromises)).filter(Boolean) as GalleryImage[];
      setGalleryImages(images);
    } catch (error) {
      console.error("Gallery load error:", error);
    } finally {
      setGalleryLoading(false);
    }
  }, [policyId, galleryLoading]);

  // Load more gallery images
  const loadMoreGalleryImages = useCallback(() => {
    setVisibleGalleryCount(prev => Math.min(prev + GALLERY_BATCH_SIZE, galleryImages.length));
  }, [galleryImages.length]);

  // Intersection observer for lazy loading more gallery images
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleGalleryCount < galleryImages.length) {
          loadMoreGalleryImages();
        }
      },
      { threshold: INTERSECTION_THRESHOLD }
    );

    observer.observe(loadMoreRef.current);
    galleryObserverRef.current = observer;

    return () => {
      if (galleryObserverRef.current) {
        galleryObserverRef.current.disconnect();
      }
    };
  }, [visibleGalleryCount, galleryImages.length, loadMoreGalleryImages]);

   useEffect(() => {
   const loadPdfUrl = async () => {
     try {
       const pdfRef = ref(storage, `policy/reference/${policyId}.pdf`);
       const url = await getDownloadURL(pdfRef);
       setPdfUrl(url);
     } catch (err) {
      console.warn("ไม่พบ PDF สำหรับโครงการนี้");
       setPdfUrl("");
     }
   };

   // ตรวจเช็กแค่ policyId ว่ามีค่า ก็โหลดได้เลย
   if (policyId) loadPdfUrl();
 }, [policyId]);

  // Main data fetching with better error handling and performance
  useEffect(() => {
    if (!policyId) return;

    const fetchAllData = async () => {
      setIsInitialLoading(true);

      try {
        // Initialize fingerprint cache from session storage
        const cachedFingerprint = sessionStorage.getItem('userFingerprint');
        if (cachedFingerprint) {
          setFingerprintCache(cachedFingerprint);
        }

        // Parallel fetch for better performance
        const fetchPromises = [
          fetch(`/api/policydetail/${encodeURIComponent(policyId)}`).catch(e => ({ ok: false, error: e })),
          fetch(`/api/policylike?id=${policyId}`).catch(e => ({ ok: false, error: e })),
          fetch(`/api/banner/${policyId}`).catch(e => ({ ok: false, error: e }))
        ];

        const [neo4jRes, likeRes, bannerRes] = await Promise.all(fetchPromises);

        if (neo4jRes instanceof Response && neo4jRes.ok) {
          const data = await neo4jRes.json();
          if (!policyName) setPolicyName(data.name);
          setDescription(data.description || "");
          setStatus(data.status || null);
          setRelatedProjects(data.relatedProjects || []);
          setParty(data.party || null);
        }

        if (likeRes instanceof Response && likeRes.ok) {
          const likeData = await likeRes.json();
          const count = typeof likeData.like === "number" ? likeData.like : Number(likeData.like) || 0;

        }

        if (bannerRes instanceof Response && bannerRes.ok) {
          const bannerUrl = await bannerRes.text();
          setBannerUrl(bannerUrl);
        }



        // Check user like status
        await checkUserLikeStatus();

        // Load gallery images after a delay to improve initial load
        setTimeout(loadGalleryImages, 500);

      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    console.log("🔄 useEffect triggered");
    fetchAllData();
  }, [policyId]);

  // Firebase timeline listener (real-time)
  useEffect(() => {
    if (!policyId) return;

    const timelineRef = collection(firestore, "Policy", policyId, "sequence");
    const unsubscribe = onSnapshot(timelineRef, (snapshot) => {
      const items: TimelineItem[] = snapshot.docs.map((doc) => doc.data() as TimelineItem);

      const sorted = items.sort((a, b) => {
        const convertThaiDate = (dateStr: string) => {
          const thMonths: Record<string, string> = {
            "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr",
            "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug",
            "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec",
          };
          return dateStr.replace(/(\d+)\s([^\d]+)\s(\d+)/, (_, d, m, y) => {
            return `${d} ${thMonths[m] || m} ${parseInt(y) - 543}`;
          });
        };

        const dateA = new Date(convertThaiDate(a.date));
        const dateB = new Date(convertThaiDate(b.date));
        return dateB.getTime() - dateA.getTime();
      });

      setTimeline(sorted);
    });

    return unsubscribe;
  }, [policyId]);

  // Achievements fetching
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

  // Optimized image component with error handling
  const OptimizedImage = useCallback(({ src, alt, className, onClick }: {
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
  }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
      <div className={`relative overflow-hidden ${className}`}>
        {!loaded && !error && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        {error ? (
          <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500 text-sm">ไม่สามารถโหลดรูปได้</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className={`w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            onClick={onClick}
            loading="lazy"
          />
        )}
      </div>
    );
  }, []);

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

            {/* Enhanced Like Button with better visual feedback */}
            <button
              data-like-button
              onClick={handleLike}
              disabled={likeState.isLoading}
              className="focus:outline-none relative group transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              title={likeState.isLiked ? "กดเพื่อยกเลิกไลค์" : "กดเพื่อไลค์"}
            >
              <Heart
                size={26}
                fill={likeState.isLiked ? "currentColor" : "none"}
                className={`transition-all duration-300 ${likeState.isLiked
                  ? "text-[#e32222] drop-shadow-lg"
                  : "text-gray-200 group-hover:text-pink-300 group-hover:scale-110"
                  }`}
              />
              {likeState.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>

            <span className="text-white text-lg font-semibold tabular-nums">
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
              onError={() => setBannerUrl("")}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#5D5A88] to-[#47457b]"></div>
          )}

          {party && (
            <div className="absolute top-4 right-6 w-[60px] h-[60px] z-20">
              <Image
                src={`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${party.id}.png?alt=media`}
                alt="โลโก้พรรค"
                width={60}
                height={60}
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/default-logo.png"; // fallback
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
          <h2 className="text-[#2C3E50] font-bold text-2xl my-10">ลำดับเหตุการณ์</h2>

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
                        <h3 className="text-md font-bold text-xl text-[#5D5A88] mb-1">{item.name}</h3>
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

          <h2 className="text-[#2C3E50] font-bold text-2xl my-10">ความสำเร็จ</h2>
          <div className="flex justify-center h-[300px]">
            <div className="grid grid-cols-3 gap-6 w-1/2 mt-10 mb-10 max-w-[900px] w-full">
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px] transition-shadow hover:shadow-md">
                <h3 className="text-[#2C3E50] mb-3 font-bold text-xl">เชิงโครงการ</h3>
                <p className="text-[#2C3E50]">{achievement.project?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px] transition-shadow hover:shadow-md">
                <h3 className="text-[#2C3E50] mb-3 font-bold text-xl">เชิงกระบวนการ</h3>
                <p className="text-[#2C3E50]">{achievement.process?.description || "-"}</p>
              </div>
              <div className="border border-gray-300 bg-white rounded-xl p-4 text-center max-w-[300px] transition-shadow hover:shadow-md">
                <h3 className="text-[#2C3E50] mb-3 font-bold text-xl">เชิงนโยบาย</h3>
                <p className="text-[#2C3E50]">{achievement.policy?.description || "-"}</p>
              </div>
            </div>
          </div>

          <h2 className="text-[#2C3E50] font-bold text-2xl  my-10">โครงการที่เกี่ยวข้อง</h2>

          {relatedProjects.filter(p => p.name?.trim()).length > 0 ? (
            <div className="grid grid-cols-2 gap-6 mt-4 mb-20">
              {relatedProjects
                .filter((project) => project.name?.trim())
                .map((project) => (
                  <Link
                    key={project.name}
                    href={`/campaigndetail/${encodeURIComponent(project.id)}`}
                    className="no-underline"
                  >
                    <div className="border border-gray-300 bg-white rounded-xl p-4 hover:shadow-md transition cursor-pointer h-full">
                      <h3 className="text-[#2C3E50] mb-2 font-bold text-xl">{project.name}</h3>
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

          {pdfUrl && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow hover:shadow-lg transition">
              <h3 className="font-bold text-xl text-[#2C3E50] mb-2">📄 เอกสารอ้างอิง</h3>
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
        </div>


        {/* Enhanced Gallery Section with Optimized Loading */}
        <h2 className="text-[#2C3E50] text-2xl text-center font-bold my-10">แกลเลอรี่รูปภาพ</h2>
        <section className="bg-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            {galleryLoading && visibleGalleryCount === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : galleryImages.length > 0 ? (
              <>
                {/* Optimized Masonry Grid */}
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                  {galleryImages.slice(0, visibleGalleryCount).map((image, idx) => (
                    <div
                      key={idx}
                      className="relative break-inside-avoid mb-4 overflow-hidden rounded-xl shadow-lg group cursor-pointer"
                      onClick={() => setSelectedUrl(image.url)}
                    >
                      <OptimizedImage
                        src={image.url}
                        alt={`แกลเลอรี่รูปที่ ${idx + 1}`}
                        className="w-full transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      {/* Caption */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-sm text-white font-medium">รูปที่ {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Trigger */}
                {visibleGalleryCount < galleryImages.length && (
                  <div ref={loadMoreRef} className="text-center mt-8">
                    <div className="inline-flex items-center space-x-2 text-gray-500">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-[#5D5A88] rounded-full animate-spin"></div>
                      <span>กำลังโหลดรูปเพิ่มเติม...</span>
                    </div>
                  </div>
                )}

                {/* Gallery Stats */}
                <div className="text-center mt-6 text-sm text-gray-500">
                  แสดง {Math.min(visibleGalleryCount, galleryImages.length)} จาก {galleryImages.length} รูป
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">ไม่มีรูปภาพในแกลเลอรี</p>
                  <p className="text-gray-400 text-sm">รูปภาพจะปรากฏที่นี่เมื่อมีการอัพโหลด</p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Lightbox Modal */}
          {selectedUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
              onClick={() => setSelectedUrl(null)}
            >
              <div className="relative max-w-full max-h-full">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedUrl(null)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full flex items-center justify-center text-white transition-all duration-200"
                  aria-label="ปิดรูป"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Main Image */}
                <img
                  src={selectedUrl}
                  alt="ขยายภาพ"
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {galleryImages.findIndex(img => img.url === selectedUrl) + 1} / {galleryImages.length}
                </div>
              </div>
            </div>
          )}
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default PolicyDetailPage;