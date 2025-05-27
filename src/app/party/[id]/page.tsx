"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface Member {
  id: string;
  Prefix?: string;
  FirstName: string;
  LastName: string;
  Role?: string;
  Picture?: string;
}

const PartyPage = () => {
  const [isClient, setIsClient] = useState(false);
  

  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logo, setLogo] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [leader, setLeader] = useState<Member | null>(null);
  
const params = useParams();
  const id = decodeURIComponent(params.id as string);  // ใช้ id แทน name
const [partyName, setPartyName] = useState(""); // เพื่อดึงชื่อพรรคจาก Neo4j


  useEffect(() => {
    setIsClient(true);
  }, []);

  // ดึงข้อมูลพรรคจาก Neo4j
  useEffect(() => {
    if (!id) return;

    const fetchPartyData = async () => {
  try {
    const res = await fetch(`/api/party/${encodeURIComponent(id)}`);
    const data = await res.json();
    setPartyName(data.name);
    setDescription(data.description || "");
    setLink(data.link || "");
    const logoUrl = `https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/party%2Flogo%2F${id}.png?alt=media`;
    setLogo(logoUrl);
  } catch (error) {
    console.error("Error loading party from Neo4j:", error);
  }
};

    fetchPartyData();
  }, [id]);

  // ดึงข้อมูลสมาชิกจาก Firestore
  useEffect(() => {
    if (!id) return;
    const membersRef = collection(firestore, "Party", id, "Member");

  
    const unsubscribe = onSnapshot(membersRef, async (snapshot) => {
      const membersData: Member[] = await Promise.all(
  snapshot.docs.map(async (doc) => {
    const data = doc.data();

    const memberId = doc.id;
    const firstName: string = data.FirstName || "ไม่ระบุชื่อ";
    const lastName: string = data.LastName || "ไม่ระบุนามสกุล";
    const role: string = data.Role || "ไม่ระบุตำแหน่ง";
    const prefix: string = data.Prefix || "";

    const basePath = `party/member/${id}/${memberId}`;
    let imageUrl = "/default-profile.png";

    try {
      const jpgResponse = await fetch(`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/${encodeURIComponent(basePath)}.jpg?alt=media`);
      if (jpgResponse.ok) {
        imageUrl = jpgResponse.url;
      } else {
        const pngResponse = await fetch(`https://firebasestorage.googleapis.com/v0/b/policy-tracker-kp.firebasestorage.app/o/${encodeURIComponent(basePath)}.png?alt=media`);
        if (pngResponse.ok) {
          imageUrl = pngResponse.url;
        }
      }
    } catch (err) {
      console.warn(`⚠️ ไม่พบรูปสมาชิก: ${memberId}`);
    }

    return {
      id: memberId,
      Prefix: prefix,
      FirstName: firstName,
      LastName: lastName,
      Role: role,
      Picture: imageUrl,
    };
  })
);
    
      const leaderMember = membersData.find((m) => m.Role === "หัวหน้าพรรค") || null;
      setMembers(membersData);
      setLeader(leaderMember);
    });
    
    
    
  
    return () => unsubscribe();
  }, [id]);
  

  return (
  <div className="">
    <Navbar />
    <div className="font-prompt">
      {isClient ? (
        <>
          <div
            className="bg-cover bg-center"
            style={{ backgroundImage: "url('/bg/พรรค.png')" }}
          >
            <div className="flex flex-row mb-10">
              <div className="grid grid-rows-3 p-12 w-2/3">
                <div className="flex gap-20 items-center mb-10">
                  <h1 className="text-white text-[4rem] m-0 font-bold">
                    พรรค{partyName}
                  </h1>
                  <img
                    className="h-[70px]"
                    src={logo || "/default-logo.png"}
                    alt="โลโก้พรรค"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-logo.png";
                    }}
                  />
                </div>
                <p className="text-white max-w-[80%] text-[1.5rem]">
                  {description || "กำลังโหลดข้อมูล..."}
                </p>
                <div className="mt-20">
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <button className="w-[200px] px-4 py-3 bg-white mr-4 text-[#5D5A88] text-[20px] rounded-lg">
                      เว็บไซต์พรรค
                    </button>
                  </a>

                  <a href={`/partycategory/${encodeURIComponent(id)}`}>
                    <button className="w-[200px] px-4 py-3 bg-white mr-4 text-[#5D5A88] text-[20px] rounded-lg">
                      นโยบายพรรค
                    </button>
                  </a>
                </div>
              </div>

              {/* หัวหน้าพรรค */}
              <div className="flex flex-col items-center justify-center w-1/3 p-8 rounded-lg shadow-md gap-10">
                {leader ? (
                  <>
                    <h2 className="text-white text-center text-[2rem] font-bold">
                      {leader.Role}
                    </h2>
                    <img
                      src={leader.Picture}
                      alt={leader.Role}
                      className="w-[400px] h-[400px] rounded-full mt-4 shadow-lg"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.fallbackTried) {
                          img.src = (img.src || "").replace(".jpg", ".png");
                          img.dataset.fallbackTried = "true";
                        } else {
                          img.src = "/default-profile.png";
                        }
                      }}
                    />
                    <p className="text-white text-[32px] font-semibold">
                      {`${leader.Prefix || ""} ${leader.FirstName} ${leader.LastName}`}
                    </p>
                  </>
                ) : (
                  <p className="text-white text-center">ไม่พบข้อมูลหัวหน้าพรรค</p>
                )}
              </div>
            </div>
          </div>

          {/* สมาชิกพรรค */}
          <div className="flex flex-col justify-center w-[95%] mx-auto">
            <h3 className="font-bold text-[#5D5A88] text-[2rem] mb-10">กรรมการบริหารพรรค</h3>
            <div className="grid grid-cols-4 grid-rows-auto gap-4 mb-10">
              {members.length > 0 ? (
                members
                  .filter((m) => m.Role !== "หัวหน้าพรรค")
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-row justify-center border-2 border-gray-200 rounded-xl py-4 px-6"
                    >
                      <div className="w-1/2">
                        <h4 className="text-[#5D5A88] text-[1.5rem]">{member.Role}</h4>
                        <p className="text-[#5D5A88]">
                          {`${member.Prefix || ""} ${member.FirstName} ${member.LastName}`}
                        </p>
                      </div>
                      <div className="w-1/2">
                        <img
                          className="w-[200px] rounded-full"
                          src={member.Picture}
                          alt={member.FirstName}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (!img.dataset.fallbackTried) {
                              img.src = (img.src || "").replace(".jpg", ".png");
                              img.dataset.fallbackTried = "true";
                            } else {
                              img.src = "/default-profile.png";
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-[#5D5A88]">กำลังโหลดข้อมูลสมาชิก...</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20">กำลังโหลดข้อมูล...</div>
      )}
      <Footer />
    </div>
  </div>
);
}

export default PartyPage;