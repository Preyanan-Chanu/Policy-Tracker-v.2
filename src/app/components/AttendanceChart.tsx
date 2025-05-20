"use client"

import Image from 'next/image';
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  {
    name: 'ไตรมาส 1',
    income: 40,
    outcome: 24,
    
  },
  {
    name: 'ไตรมาส 2',
    income: 30,
    outcome: 13,
    
  },
  {
    name: 'ไตรมาส 3',
    income: 20,
    outcome: 68,
    
  },
  {
    name: 'ไตรมาส 4',
    income: 27,
    outcome: 39,
    
  },
];

const AttendanceChart = () => {
    return (
        <div className="bg-white rounded-lg p-4 h-full">
            <div className='flex justify-between items-center'>
                <h1>งบประมาณ (หน่วย : ล้านบาท)</h1>
                <Image src="/moreDark.png" alt="" width={20} height={20} />
            </div>
            <ResponsiveContainer width="100%" height="90%">
        <BarChart
          width={500}
          height={300}
          data={data}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3"  vertical={false}/>
          <XAxis dataKey="name" axisLine={false}/>
          <YAxis axisLine={false}/>
          <Tooltip />
          <Legend  align="left" verticalAlign='top' wrapperStyle={{paddingTop:"20px",paddingBottom:"40px"}}/>
          <Bar dataKey="income" fill="#8884d8" legendType='circle' radius={[10,10,0,0]}/>
          <Bar dataKey="outcome" fill="#82ca9d" legendType='circle' radius={[10,10,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
        </div>
    )
}

export default AttendanceChart