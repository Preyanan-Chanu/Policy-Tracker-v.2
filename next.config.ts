import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "static.scientificamerican.com",
      "firebasestorage.googleapis.com", 
    ],
  },
  experimental: {
    // ใส่ค่าตามที่ใช้ (ถ้ายังไม่ใช้สามารถลบทิ้งหรือเว้นว่างไว้ได้)
  },
};

export default nextConfig;
