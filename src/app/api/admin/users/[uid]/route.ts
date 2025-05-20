import { NextRequest, NextResponse } from "next/server";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";
import { getAuth } from "firebase-admin/auth";
import { app } from "@/app/lib/firebase-admin"; // ต้องมี firebase-admin setup

export async function DELETE(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid;

  try {
    await deleteDoc(doc(firestore, "users", uid)); // ลบจาก Firestore
    await getAuth(app).deleteUser(uid); // ลบจาก Authentication
    return NextResponse.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
