// src/app/api/campaignbanner/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/app/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'

export async function GET(
  req: NextRequest,
  context: { params: { name?: string } }
) {
  const { name } = await context.params
  if (!name) {
    return NextResponse.json({ error: 'Missing name param' }, { status: 400 })
  }

  // ลองดึงไฟล์ .jpg และ .png จากโฟลเดอร์ campaign/banner
  for (const ext of ['jpg', 'png'] as const) {
    try {
      const imageRef = ref(storage, `campaign/banner/${name}.${ext}`)
      const url = await getDownloadURL(imageRef)
      // redirect ไปที่ URL รูป
      return NextResponse.redirect(url)
    } catch {
      // ไม่พบไฟล์ ext นี้ → ลองต่อ
    }
  }

  // ถ้าไม่เจอทั้ง jpg/png
  return NextResponse.json(
    { error: `Banner not found for campaign: ${name}` },
    { status: 404 }
  )
}
