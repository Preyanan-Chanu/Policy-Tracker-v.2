"use client";

interface Props {
  title: string;
  main: string | number;
  sub?: string;
}

export default function DashboardCard({ title, main, sub }: Props) {
  return (
    <div className="w-full p-6 bg-[#f5f8ff] rounded-xl shadow-md text-center h-full flex flex-col justify-between">
      <h3 className="text-lg md:text-xl font-semibold text-[#3f3c62] mb-3">{title}</h3>
      <div className="flex-grow flex flex-col justify-center">
        <p className="text-xl md:text-2xl font-bold text-[#5D5A88] mb-2">{main}</p>
        {sub && <p className="text-sm md:text-md text-gray-600">{sub}</p>}
      </div>
    </div>
  );
}