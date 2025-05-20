import { NextResponse } from "next/server";
import { getDocs, collection } from "firebase/firestore";
import { firestore } from "@/app/lib/firebase";

export async function GET() {
  const snapshot = await getDocs(collection(firestore, "users"));
  const users = snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
  return NextResponse.json(users);
}
