// src/app/api/campaignbanner/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/app/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'

export async function GET(
  req: NextRequest,
  context: { params: { id?: string } }
) {
  const { id } = context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
  }

  // ลองดึงไฟล์ .jpg และ .png จากโฟลเดอร์ campaign/banner/[id]
  for (const ext of ['jpg', 'png'] as const) {
    try {
      const imageRef = ref(storage, `campaign/banner/${id}.${ext}`)
      const url = await getDownloadURL(imageRef)
      return NextResponse.redirect(url)
    } catch {
      // ไม่พบไฟล์ → ลองไฟล์ถัดไป
    }
  }

  return NextResponse.json(
    { error: `Banner not found for campaign ID: ${id}` },
    { status: 404 }
  )
}
