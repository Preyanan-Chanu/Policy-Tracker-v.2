"use client";

import Image from "next/image";
import logopakImg from "../../../public/logo_pak.svg"


// TEMPORARY
const events = [
  {
    id: 1,
    title: "Hackathon นโยบาย ปากน้ำเมืองแฮกได้",
    time: "12:00 PM - 2:00 PM",
    description: "เมืองปากน้ำสมุทรปราการ เป็นพื้นที่ที่มีศักยภาพและเป็นศูนย์กลางของกรุงเทพในหลายมิติ",
  },
  {
    id: 2,
    title: "เวทีเสวนา “ก้าวต่อไปของท้องถิ่นอุดร”",
    time: "12:00 PM - 2:00 PM",
    description: "ขอเชิญสมาชิกพรรคร่วมกิจกรรมสมาชิกสัมพันธ์ เวทีเสวนา หัวข้อ“ ก้าวต่อไป ของท้องถิ่นอุดร “",
  },
  {
    id: 3,
    title: "ตั้งวงฟังเสียงประชาชน",
    time: "12:00 PM - 2:00 PM",
    description: "เพราะเราคือ #พรรคของประชาชน ขอเชิญประชาชนชาวเมืองราชบุรีทุกคนมาร่วมวงกัน",
  },
];

const EventCalendar = () => {
  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex flex-col items-center">
      <Image src="/logo_pak.svg" alt="" width={300} height={300} className="rounded-md my-5" />
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">กิจกรรม</h1>
        <Image src="/moreDark.png" alt="More" width={20} height={20} />
      </div>
      <div className="flex flex-col gap-4">
        {events.map((event) => (
          <div
            className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
            key={event.id}
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">{event.title}</h1>
              <span className="text-gray-300 text-xs">{event.time}</span>
            </div>
            <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;