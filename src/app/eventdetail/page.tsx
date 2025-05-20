// "use client";
// import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
// import Link from "next/link";
// import Image from "next/image";
// import Navbar from "@/app/components/Navbar";
// import Footer from "@/app/components/Footer";

// const mapContainerStyle = {
//     width: '70%',
//     height: '400px',
//   };
  
//   const center = {
//     lat: 13.7899,   // ใส่พิกัดของสถานที่จริง เช่น เขต 18 กรุงเทพ
//     lng: 100.6420,
//   };

// const EventDetailPage = () => {
//   return (
    
//     <div className="bg-white text-[#5D5A88]">
//         <Navbar />
//         <div className="bg-[url('/สมาชิกสัมพันธ์.jpg')] h-[400px] flex bg-cover bg-center flex justify-center items-center">
//             <button className='bg-white py-2 px-4  rounded-full'>ย้อนกลับ</button>
//         </div>
//         <div className="bg-white">
//             <div className="border-2 border-gray-300 rounded-lg m-4 p-10">
//                 <div className="flex flex-row justify-between">
//                     <h2 className='mb-3'>กิจกรรมสมาชิกสัมพันธ์</h2>
//                     <div className='flex gap-4'>
//                         <button className='bg-theme3 rounded-full px-4 py-2 text-white'>นโยบายที่เกี่ยวข้อง</button>
//                         <img src="/ก้าวไกล.png" alt="" className='h-[40px]' />
//                     </div>
//                 </div>
//                 <div className='flex flex-row gap-10 ml-5 mb-5'>
//                     <div className="font-bold">
//                         <p>วัน</p>
//                         <p>เวลา</p>
//                         <p>สถานที่</p>
//                         <p>สถานะ</p>
//                     </div>
//                     <div className="font-regular">
//                         <p className='font-regular'>26 พฤศจิกายน 2566</p>
//                         <p>12:30 - 16:00 น</p>
//                         <p>ศูนย์ประสานงาน พรรคก้าวไกล - กรุงเทพ เขต18.</p>
//                         <p>เสร็จสิ้นแล้ว</p>
//                     </div>
//                 </div>    
//                 <div>
//                     <h2 className='mb-3'>รายละเอียด</h2>
//                     <p className='ml-5 mb-5'>
//                     กิจกรรมสมาชิกสัมพันธ์ “ประชาชนก้าวไกล”กรุงเทพมหานคร เขต 18 (หนองจอก มีนบุรี ลาดกระบัง)
//                     .
//                     ร่วมเสวนาพบปะพูดคุยกับ รองหัวหน้าพรรคก้าวไกล คุณพิจารณ์ เชาวพัฒนวงศ์, ส.ส.ธีรัจชัย พันธุมาศ เขต18 , ส.ส.ศศินันท์ ธรรมนิฐินันท์ (ทนายแจม)ที่จะมาร่วมพูดคุยถึงความสำคัญของการสมัครสมาชิกพรรค การสร้างฐานสมาชิก การสมัครรับเลือกตั้งในทุกระดับ ทั้งระดับชาติ/ระดับท้องถิ่น ติดอาวุธทางการเมือง สิทธิพื้นฐานของประชาชน ร่วมกันตรวจสอบการทำงานของรัฐ หน่วยงานราชการ
//                     .
//                     ร่วมสมัครสมาชิกพรรค ร่วมเป็นเจ้าของพรรค ร่วมคิด ร่วมตัดสินใจ ให้พรรคก้าวไกลเป็นพรรคของมวลชน เพื่อให้หนองจอก มีนบุรี ลาดกระบัง และประเทศไทยเปลี่ยนแปลง ไม่เหมือนเดิมอีกต่อไป
//                     .
//                     </p>
//                 </div>
//                 <h2 className='mb-3'>รูปภาพเพิ่มเติม</h2>
//                 <img src="/สมาชิกสัมพันธ์.jpg" alt="main pic" className='h-[1000px] mx-auto mb-5'/>
//                 <h2 className='mb-3'>แผนที่</h2>
//                 {/* ✅ แสดง Google Map */}
//                 <div className='flex justify-center'>
//                     <LoadScript googleMapsApiKey="AIzaSyCaFgsyBvv7xYOfsQM-wf7P7kx7JJ9OubA">
//                         <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={15}>
//                         <Marker position={center} />
//                         </GoogleMap>
//                     </LoadScript>
//                 </div>
//                 <div className='flex justify-center my-5'>
//                     <a
//                     href="https://www.google.com/maps/dir/?api=1&destination=14.0711,100.6034"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="bg-theme3 text-white no-underline rounded-full px-4 py-2 text-[1.5rem]"
//                     >
//                         แสดงเส้นทาง
//                     </a>
//                 </div>
//             </div>
//             <div className="flex flex-row text-white">
//                 <div className="w-1/3 bg-blue-500">
//                     <h3 className=''>การเงิน</h3>
//                 </div>
//                 <div className="w-2/3 flex flex-col bg-purple-500">
//                     <div className="w-full">
//                         <h2>งบประมาณที่ใช้</h2>
//                     </div>
//                     <div className="flex flex-row">
//                         <div className="w-2/3">
//                             //graph
//                         </div>
//                         <div className="w-1/3 flex flex-col">
//                             <p>จัดกิจกรรม</p>
//                             <p>สาธารณูปโภค</p>
//                             <p>บุคลากร</p>
//                             <p>ลงทุน</p>
//                         </div>
//                     </div>
//                     <div className="w-full flex justify-end">
//                         <button className="bg-gray-700 text-white">สนับสนุน</button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         <Footer />
//     </div>
//   );
// }

// export default EventDetailPage;