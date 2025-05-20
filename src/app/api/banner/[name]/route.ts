// src/app/api/banner/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/app/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const {name} = await params
  if (!name) {
    return new NextResponse('Missing name', { status: 400 })
  }

  for (const ext of ['jpg','png'] as const) {
    try {
      const url = await getDownloadURL(ref(storage, `policy/banner/${name}.${ext}`))
      // คืนเป็น plain text แค่ URL รูป
       // คืนเป็น plain text แค่ URL รูป (ไม่ต้อง redirect)
     return new NextResponse(url, {
       status: 200,
       headers: { 'Content-Type': 'text/plain' }
     })
    } catch {}
  }

  return new NextResponse('Banner not found', { status: 404 })
}