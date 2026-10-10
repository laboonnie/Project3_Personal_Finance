import { useEffect, useState } from "react";
import { getAdminSummary, getUsersByMonth } from "../../api/adminDashboardApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "./adminDashboard.css"; // Import CSS mới

// SVG Icons tối giản
const UsersIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CategoryIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const TransactionIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// Custom Tooltip cho Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="m-0 font-weight-bold">{`Tháng ${label}`}</p>
        <p className="m-0" style={{ color: '#3ca0fc' }}>{`Số lượng: ${payload[0].value} người`}</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState({});
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadSummary();
    loadChart();
  }, []);

  const loadSummary = async () => {
    const res = await getAdminSummary();
    setSummary(res.data);
  };

  const loadChart = async () => {
    const res = await getUsersByMonth();
    setChartData(res.data);
  };

  return (
    <div className="admin-dashboard-wrapper">
      <h2 className="admin-title">Admin Dashboard</h2>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="summary-card bg-users">
            <div className="summary-card-icon">
              <UsersIcon />
            </div>
            <div className="card-title-sub">Total Users</div>
            <h3 className="card-value">{summary.totalUsers || 0}</h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="summary-card bg-categories">
            <div className="summary-card-icon">
              <CategoryIcon />
            </div>
            <div className="card-title-sub">Total Categories</div>
            <h3 className="card-value">{summary.totalCategories || 0}</h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="summary-card bg-transactions">
            <div className="summary-card-icon">
              <TransactionIcon />
            </div>
            <div className="card-title-sub">Total Transactions</div>
            <h3 className="card-value">{summary.totalTransactions || 0}</h3>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="fin-card">
        <h5 className="card-head-title">Users Registered Per Month</h5>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#8f9bba', fontSize: 13, fontWeight: 600 }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#8f9bba', fontSize: 13, fontWeight: 600 }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="total" 
                fill="#3ca0fc" 
                radius={[10, 10, 0, 0]} /* Bo tròn góc đỉnh các cột */
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}