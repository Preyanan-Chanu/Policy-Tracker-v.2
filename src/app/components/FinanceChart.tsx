"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Jan",
    income: 40,
    expense: 24,
  },
  {
    name: "Feb",
    income: 30,
    expense: 13,
  },
  {
    name: "Mar",
    income: 20,
    expense: 70,
  },
  {
    name: "Apr",
    income: 27,
    expense: 39,
  },
  {
    name: "May",
    income: 18,
    expense: 48,
  },
  {
    name: "Jun",
    income: 23,
    expense: 38,
  },
  {
    name: "Jul",
    income: 34,
    expense: 43,
  },
  {
    name: "Aug",
    income: 39,
    expense: 48,
  },
  {
    name: "Sep",
    income: 47,
    expense: 57,
  },
  {
    name: "Oct",
    income: 50,
    expense: 40,
  },
  {
    name: "Nov",
    income: 28,
    expense: 48,
  },
  {
    name: "Dec",
    income: 35,
    expense: 39,
  },
];

const FinanceChart = () => {
  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">งบประมาณดำเนินการนโยบาย</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis axisLine={false} tick={{ fill: "#d1d5db" }} tickLine={false}  tickMargin={20}/>
          <Tooltip />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#C3EBFA"
            strokeWidth={5}
          />
          <Line type="monotone" dataKey="expense" stroke="#CFCEFF" strokeWidth={5}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;