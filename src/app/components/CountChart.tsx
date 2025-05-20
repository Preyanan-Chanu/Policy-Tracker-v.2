"use client"
import Image from 'next/image';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer } from 'recharts';

const data = [
    {
    name: 'ทั้งหมด',
    count: 14,
    fill: 'white',
  },
  {
    name: 'เสร็จ',
    count: 12,
    fill: 'lightblue',
  },
  {
    name: 'ยังไม่เสร็จ',
    count: 2,
    fill: '#83a6ed',
  },
];

const CountChart = () => {
    return (
        <div className="bg-white rounded-xl w-full h-full p-4">
            {/* TITLE */}
            <div className='flex justify-between items-center'>
                <h1 className='text-lg font-smibold'>โครงการ</h1>
                <Image src="/moreDark.png" alt="" width={20} height={20}/>
            </div>
            {/* CHART */}
            <div className='relative w-full h-[75%]'>
            <ResponsiveContainer>
        <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="100%" barSize={32} data={data}>
          <RadialBar
            background
            dataKey="count"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <Image src="/maleFemale.png" alt="" width={50} height={50} className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'/>
            </div>
            {/* BOTTOM */}
            <div className='flex justify-center gap-16'>
                <div className='flex flex-col gap-1'>
                    <div className='w-5 h-5 bg-[#2EB82E] rounded-full'/>
                    <h1 className='font-bold'>12</h1>
                    <h2 className='text-xs'>เสร็จ (55%)</h2>
                </div>
                <div className='flex flex-col gap-1'>
                    <div className='w-5 h-5 bg-[#83a6ed] rounded-full'/>
                    <h1 className='font-bold'>2</h1>
                    <h2 className='text-xs'>ยังไม่เสร็จ (45%)</h2>
                </div>
            </div>
        </div>
    )
}

export default CountChart