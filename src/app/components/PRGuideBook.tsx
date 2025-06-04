"use client";

import React, { useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { useEffect, useState } from "react";




export default function PRGuideBook() {
    const bookRef = useRef<any>(null);
    useEffect(() => {
        console.log("📘 PRGuideBook mounted");
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center bg-cover bg-center p-4 " style={{ backgroundImage: "url('/bg/หัวข้อ.png')" }}>
            <HTMLFlipBook
                ref={bookRef}
                size="stretch"           
                width={300}                
                height={400}
                swipeDistance={30}
                minWidth={300}
                maxWidth={600}
                minHeight={400}
                maxHeight={800}
                maxShadowOpacity={0.5}
                showCover={true}
                useMouseEvents={true}
                startPage={0}
                drawShadow={true}
                flippingTime={600}
                usePortrait={false}
                startZIndex={0}
                autoSize={true}
                clickEventForward={true}
                mobileScrollSupport={true}
                showPageCorners={true}
                disableFlipByClick={false}
                style={{ margin: "0 auto" }}
                className="shadow-lg rounded-md"
            >
                {/* หน้าปก */}
                <div className="bg-[#F1F1F1] p-10 w-full h-full shadow-inner border border-gray-200 flex flex-col items-center justify-center">
                    <h2 className="text-3xl font-bold mb-2 text-center">PolicyTracker</h2>
                    <p className="text-lg text-center">คู่มือการใช้งานระบบสำหรับ PR พรรค</p>
                </div>

                {/* เนื้อหา */}
                <div className="bg-[#FAF3E0] p-10 w-full h-full shadow-inner border border-gray-200 text-sm leading-relaxed text-[#3f3c62] overflow-y-auto flex flex-col">
                    <h3 className="font-bold text-lg mb-2">📘 คู่มือการจัดการนโยบาย</h3>
                    <ol className="list-decimal list-inside space-y-4">
                        <li>
                            <strong>➕ เพิ่มนโยบาย:</strong><br />
                            คลิกปุ่ม "➕ เพิ่มนโยบาย" ที่ด้านบนของหน้า <code>รายการนโยบาย</code> <br />
                            จะเข้าสู่แบบฟอร์ม <strong>ฟอร์มสำหรับกรอกข้อมูลนโยบาย</strong> ที่คุณสามารถกรอกข้อมูลต่อไปนี้:
                            <ul className="list-disc list-inside ml-6 mt-2">
                                <li><strong>ชื่อนโยบาย:</strong> เช่น "ส่งเสริมการท่องเที่ยวในจังหวัดชายแดนใต้"</li>
                                <li><strong>หมวดหมู่:</strong> เลือกจาก dropdown เช่น "เศรษฐกิจ", "สังคม"</li>
                                <li><strong>รายละเอียด:</strong> อธิบายวัตถุประสงค์และแผนดำเนินงาน</li>
                                <li><strong>สถานะ:</strong> ระบุความคืบหน้าของนโยบาย เช่น เริ่มนโยบาย → วางแผน → ...</li>
                                <li><strong>แนบรูปภาพ/แบนเนอร์:</strong> อัปโหลดภาพประกอบ เช่น แผนที่หรือโปสเตอร์</li>
                                <li><strong>อัปโหลด PDF:</strong> สำหรับเอกสารอ้างอิง</li>
                                <li><strong>เพิ่ม Timeline:</strong> ระบุเหตุการณ์ เช่น "เริ่มประชุมคณะทำงาน 5 มิ.ย. 2568"</li>
                            </ul>
                        </li>

                        <li>
                            <strong>✏ แก้ไขนโยบาย:</strong><br />
                            ที่หน้า <code>รายการนโยบาย</code> คลิกปุ่ม "✏ แก้ไข" ใต้การ์ดนโยบายที่ต้องการ<br />
                            คุณจะกลับเข้าสู่ฟอร์มโดยมีข้อมูลเดิมกรอกไว้แล้ว ซึ่งสามารถปรับแก้และกดบันทึกใหม่ได้
                        </li>

                        <li>
                            <strong>❌ ลบนโยบาย:</strong><br />
                            คลิก "❌ ลบ" ใต้มุมนโยบายที่ต้องการลบ แล้วกดยืนยันเมื่อมีข้อความแจ้งเตือน<br />
                            ระบบจะลบข้อมูลจากทั้งฐานข้อมูลหลักและ Firebase
                        </li>
                    </ol>

                    <div className="mt-6">
                        <p><strong>🔎 ตัวอย่าง:</strong></p>
                        <div className="bg-gray-100 p-4 rounded-lg mt-2 text-sm">
                            <p><strong>ชื่อ:</strong> การกระจายวัคซีนให้ครอบคลุมทุกพื้นที่</p>
                            <p><strong>หมวดหมู่:</strong> สังคม คุณภาพชีวิต</p>
                            <p><strong>รายละเอียด:</strong> เพิ่มงบประมาณให้โรงพยาบาลชุมชน จัดซื้อและกระจายวัคซีน</p>
                            <p><strong>สถานะ:</strong> ดำเนินการ</p>
                            <p><strong>Timeline:</strong> 10 มิ.ย. 2568: เริ่มประชุม / 1 ก.ค. 2568: เริ่มกระจายวัคซีน</p>
                        </div>
                    </div>
                </div>



                <div className="bg-[#FAF3E0] p-10 w-full h-full shadow-inner border border-gray-200 text-sm leading-relaxed text-[#3f3c62] overflow-y-auto flex flex-col">
                    <h3 className="font-bold text-lg mb-2">📘 คู่มือการจัดการโครงการ</h3>
                    <ol className="list-decimal list-inside space-y-4">
                        <li>
                            <strong>➕ เพิ่มโครงการ:</strong><br />
                            คลิกปุ่ม "➕ เพิ่มโครงการ" ที่หน้า <code>โครงการที่บันทึกไว้</code><br />
                            คุณจะเข้าสู่แบบฟอร์ม <strong>ฟอร์มสำหรับกรอกข้อมูลโครงการ</strong> ที่มีฟิลด์สำคัญเช่น:
                            <ul className="list-disc list-inside ml-6 mt-2">
                                <li><strong>ชื่อโครงการ:</strong> เช่น "จัดตั้งศูนย์บ่มเพาะวิสาหกิจชุมชน"</li>
                                <li><strong>รายละเอียด:</strong> อธิบายกิจกรรมหรือแผนงาน</li>
                                <li><strong>นโยบาย:</strong> เลือกนโยบายแม่ที่เกี่ยวข้อง หรือเลือก "โครงการพิเศษ"</li>
                                <li><strong>สถานะ:</strong> ระบุขั้นตอน เช่น เริ่มโครงการ, วางแผน ฯลฯ</li>
                                <li><strong>พื้นที่และผลกระทบ:</strong> ระบบจะคำนวณขนาดโครงการให้อัตโนมัติ</li>
                                <li><strong>งบประมาณ:</strong> จำนวนเงินที่ใช้</li>
                                <li><strong>รายการรายจ่าย:</strong> กรอกรายการ เช่น ค่าอุปกรณ์, ค่าอบรม ฯลฯ</li>
                                <li><strong>แนบไฟล์:</strong> รูปภาพ, เอกสาร PDF</li>
                            </ul>
                        </li>

                        <li>
                            <strong>✏ แก้ไขโครงการ:</strong><br />
                            ที่หน้ารายการโครงการ คลิก "✏ แก้ไข" เพื่อแก้ชื่อ รายละเอียด หรือไฟล์แนบ
                        </li>

                        <li>
                            <strong>❌ ลบโครงการ:</strong><br />
                            คลิกปุ่ม "❌ ลบ" แล้วกดยืนยัน ระบบจะลบทั้งจากฐานข้อมูลและ Firebase Storage
                        </li>

                        <li>
                            <strong>📌 หมายเหตุ:</strong><br />
                            โครงการสามารถระบุได้ว่าเป็น <strong>"โครงการพิเศษ"</strong> ซึ่งไม่ต้องผูกกับนโยบาย
                        </li>
                    </ol>

                    <div className="mt-6">
                        <p><strong>🔎 ตัวอย่าง:</strong></p>
                        <div className="bg-gray-100 p-4 rounded-lg mt-2 text-sm">
                            <p><strong>ชื่อ:</strong> โครงการส่งเสริมสินค้าท้องถิ่น</p>
                            <p><strong>นโยบายที่เกี่ยวข้อง:</strong> กระตุ้นเศรษฐกิจฐานราก</p>
                            <p><strong>ขนาด:</strong> กลาง (จากพื้นที่ "หลายเขต" และผลกระทบ "ปานกลาง")</p>
                            <p><strong>งบ:</strong> 1,200,000 บาท</p>
                            <p><strong>สถานะ:</strong> วางแผน</p>
                            <p><strong>รายการจ่าย:</strong> จัดงานมหกรรมสินค้า 300,000 | ค่าประชาสัมพันธ์ 150,000 ฯลฯ</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#FAF3E0] p-10 w-full h-full shadow-inner border border-gray-200 text-sm leading-relaxed text-[#3f3c62] overflow-y-auto flex flex-col">
                    <h3 className="font-bold text-lg mb-2">📘 คู่มือการจัดการกิจกรรม</h3>
                    <ol className="list-decimal list-inside space-y-4">
                        <li>
                            <strong>➕ เพิ่มกิจกรรม:</strong><br />
                            คลิกปุ่ม "➕ เพิ่มกิจกรรม" ที่ด้านบนขวาของหน้า <code>กิจกรรมที่บันทึกไว้</code><br />
                            จะเข้าสู่ <strong>แบบฟอร์มกิจกรรม</strong> ซึ่งให้กรอกข้อมูลดังนี้:
                            <ul className="list-disc list-inside ml-6 mt-2">
                                <li><strong>ชื่อกิจกรรม:</strong> เช่น "งานเสวนานโยบายด้านสาธารณสุข"</li>
                                <li><strong>รายละเอียดกิจกรรม:</strong> อธิบายเนื้อหา วัตถุประสงค์ หรือสิ่งที่จะดำเนินการ</li>
                                <li><strong>วันและเวลา:</strong> ระบุวันจัดกิจกรรม และเวลาเริ่มต้น</li>
                                <li><strong>สถานที่:</strong> เช่น ห้องประชุมอเนกประสงค์</li>
                                <li><strong>จังหวัด:</strong> เลือกจังหวัดที่จัดงาน</li>
                                <li><strong>ตำแหน่งบนแผนที่:</strong> คลิกเลือกตำแหน่งบน Google Map</li>
                                <li><strong>นโยบายที่เกี่ยวข้อง:</strong> เลือกจากรายการนโยบายของพรรค (ถ้ามี)</li>
                                <li><strong>โครงการที่เกี่ยวข้อง:</strong> เลือกโครงการที่เชื่อมโยง (ถ้ามี)</li>
                                <li><strong>แนบรูปภาพกิจกรรม:</strong> อัปโหลดได้หลายภาพ</li>
                                <li><strong>แบนเนอร์กิจกรรม:</strong> อัปโหลดภาพหลักเพื่อใช้เป็นภาพปก</li>
                            </ul>
                        </li>

                        <li>
                            <strong>✏ แก้ไขกิจกรรม:</strong><br />
                            คลิกปุ่ม "✏ แก้ไข" ที่ด้านล่างของการ์ดกิจกรรมในหน้า <code>กิจกรรมที่บันทึกไว้</code><br />
                            ระบบจะโหลดข้อมูลเดิมเข้าสู่แบบฟอร์มอัตโนมัติ และสามารถแก้ไขแล้วกด "บันทึก" ได้ทันที
                        </li>

                        <li>
                            <strong>❌ ลบกิจกรรม:</strong><br />
                            คลิกปุ่ม "❌ ลบ" แล้วกดยืนยันในกล่องข้อความ<br />
                            ระบบจะลบกิจกรรมออกจากฐานข้อมูลและลบภาพจาก Firebase Storage อัตโนมัติ
                        </li>
                    </ol>

                    <div className="mt-6">
                        <p><strong>🔎 ตัวอย่าง:</strong></p>
                        <div className="bg-gray-100 p-4 rounded-lg mt-2 text-sm">
                            <p><strong>ชื่อ:</strong> เวทีพบประชาชน "พลังชุมชนร่วมพัฒนานโยบาย"</p>
                            <p><strong>รายละเอียด:</strong> สื่อสารนโยบายของพรรคกับชุมชนในพื้นที่ พร้อมรับฟังข้อเสนอ</p>
                            <p><strong>วันเวลา:</strong> 15 มิถุนายน 2568 เวลา 09:00 น.</p>
                            <p><strong>สถานที่:</strong> ศาลาประชาคม อำเภอเมือง จังหวัดเชียงใหม่</p>
                            <p><strong>สถานะ:</strong> กำลังดำเนินการ</p>
                            <p><strong>นโยบายที่เกี่ยวข้อง:</strong> สวัสดิการถ้วนหน้า</p>
                            <p><strong>โครงการที่เกี่ยวข้อง:</strong> ส่งเสริมศักยภาพผู้นำชุมชน</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#FAF3E0] p-10 w-full h-full shadow-inner border border-gray-200 text-sm leading-relaxed text-[#3f3c62] overflow-y-auto flex flex-col">
                    <h3 className="font-bold text-lg mb-2">📘 คู่มือการจัดการข้อมูลพรรค</h3>
                    <ol className="list-decimal list-inside space-y-4">
                        <li>
                            <strong>✏ แก้ไขข้อมูลพรรค: (ไม่มีปุ่มเพิ่มเพราะ Admin จะเป็นคนใส่ข้อมูลพรรคมาให้)</strong><br />
                            คลิกปุ่ม "✏ แก้ไขข้อมูลพรรค" ด้านบนขวาในหน้า <code>ข้อมูลพรรค</code><br />
                            ระบบจะพาคุณไปยังแบบฟอร์มที่สามารถอัปเดตรายละเอียดเว็บไซต์ และอัปโหลดโลโก้พรรคใหม่ได้ โดยมีฟิลด์:
                            <ul className="list-disc list-inside ml-6 mt-2">
                                <li><strong>ชื่อพรรค:</strong> ไม่สามารถแก้ไขได้</li>
                                <li><strong>รายละเอียด:</strong> ใส่คำอธิบายหรือวิสัยทัศน์ของพรรค</li>
                                <li><strong>เว็บไซต์:</strong> ลิงก์ทางการของพรรค</li>
                                <li><strong>โลโก้:</strong> อัปโหลดไฟล์ .png เพื่อใช้แสดงโลโก้</li>
                            </ul>
                        </li>

                        <li>
                            <strong>➕ เพิ่มสมาชิกพรรค:</strong><br />
                            คลิกปุ่ม "➕ เพิ่มข้อมูลสมาชิก"<br />
                            จะเข้าสู่ฟอร์มที่สามารถระบุข้อมูลสมาชิกได้ ได้แก่:
                            <ul className="list-disc list-inside ml-6 mt-2">
                                <li><strong>ชื่อ:</strong> เช่น "ศิริชัย"</li>
                                <li><strong>นามสกุล:</strong> เช่น "บุญมี"</li>
                                <li><strong>ตำแหน่ง:</strong> เช่น "หัวหน้าพรรค" หรือ "กรรมการบริหาร"</li>
                                <li><strong>อัปโหลดรูป:</strong> ระบบรองรับ .jpg หรือ .png</li>
                            </ul>
                        </li>

                        <li>
                            <strong>✏ แก้ไขสมาชิก:</strong><br />
                            ที่หน้า <code>ข้อมูลพรรค</code> เลื่อนลงไปยังส่วนสมาชิกพรรค<br />
                            คลิกปุ่ม "✏ แก้ไข" ใต้การ์ดสมาชิกที่ต้องการ ระบบจะแสดงข้อมูลเดิม พร้อมให้แก้ไขชื่อ ตำแหน่ง หรืออัปโหลดรูปใหม่
                        </li>

                        <li>
                            <strong>❌ ลบสมาชิก:</strong><br />
                            คลิกปุ่ม "❌ ลบ" ใต้การ์ดสมาชิก ระบบจะถามยืนยันก่อนลบ<br />
                            หากยืนยัน ข้อมูลจะถูกลบทั้งจากฐานข้อมูล Firestore และภาพจาก Firebase Storage
                        </li>
                    </ol>

                    <div className="mt-6">
                        <p><strong>🔎 ตัวอย่าง:</strong></p>
                        <div className="bg-gray-100 p-4 rounded-lg mt-2 text-sm">
                            <p><strong>ชื่อพรรค:</strong> ความเท่าเทียมใหม่</p>
                            <p><strong>เว็บไซต์:</strong> <a href="https://www.equalparty.org" className="underline text-blue-600">https://www.equalparty.org</a></p>
                            <p><strong>รายละเอียด:</strong> พรรคที่ยึดมั่นในสวัสดิการถ้วนหน้าและเศรษฐกิจพึ่งพาตนเอง</p>
                            <p><strong>สมาชิกตัวอย่าง:</strong></p>
                            <ul className="list-disc ml-6 mt-2">
                                <li><strong>ศิริชัย บุญมี</strong> – หัวหน้าพรรค</li>
                                <li><strong>อัมพร พงษ์ไพศาล</strong> – กรรมการบริหาร</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-[#FAF3E0] p-10 w-full h-full shadow-inner border border-gray-200 text-sm leading-relaxed text-[#3f3c62] overflow-y-auto">

                    <h3 className="font-bold text-center text-lg mb-2">📘 หากต้องการสอบถามรายละเอียด กรุณาติดต่อแอดมิน</h3>

                    <div className="flex justify-center items-center gap-4 my-10">
                        <img src="/ก้อง.jpg" alt="" className="w-1/2 h-1/2 object-cover" />

                        <img src="/ปูน.jpg" alt="" className="w-1/2 h-1/2 object-cover" />
                    </div>
                    <div className="flex flex-col items-end mt-20">
                        <p><strong>6409610786 สรรพวิชช์ ช่องดารากุล</strong></p>
                        <p><strong>6409680045 ปรียนันท์ ชานุ </strong></p>
                    </div>

                </div>
                <div className="bg-[#F1F1F1] p-10 w-full h-full flex items-center justify-center border border-gray-200">

                </div>

            </HTMLFlipBook>


        </div>
    );
}