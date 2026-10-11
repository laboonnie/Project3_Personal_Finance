import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function JarChart({ data }) {
  const chartData = {
    labels: data.map(x => x.jarName),
    datasets: [
      {
        data: data.map(x => x.amount),
        backgroundColor: [
          "#3CA0FC", // Necessities (Xanh dương)
          "#FF719A", // Education (Hồng pastel)
          "#05CD99", // Long Term Saving (Xanh ngọc)
          "#FFB800", // Play (Vàng)
          "#C49AFF", // Financial Freedom (Tím pastel)
          "#FF9F40"  // Give (Cam)
        ],
        borderWidth: 3,
        borderColor: "#ffffff"
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10 }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          font: { family: 'Plus Jakarta Sans', size: 13, weight: '600' },
          padding: 20
        }
      }
    }
  };

  return (
    <div className="fin-card">
      <h5 className="card-head-title">Spending by Financial Jar</h5>
      {/* Sử dụng class wrapper mới với chiều cao 340px */}
      <div className="chart-wrapper-large">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
}