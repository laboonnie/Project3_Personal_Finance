import { useEffect, useState } from "react";
import {
  getAdminSummary,
  getUsersByMonth
} from "../../api/adminDashboardApi";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

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

    <div className="container-fluid">

      <h2 className="mb-4">Admin Dashboard</h2>

      <div className="row mb-4">

        <div className="col-md-4">

          <div className="card text-white bg-primary shadow-sm">

            <div className="card-body">

              <h5 className="card-title">Total Users</h5>

              <h3>{summary.totalUsers}</h3>

            </div>

          </div>

        </div>


        <div className="col-md-4">

          <div className="card text-white bg-success shadow-sm">

            <div className="card-body">

              <h5 className="card-title">Total Categories</h5>

              <h3>{summary.totalCategories}</h3>

            </div>

          </div>

        </div>


        <div className="col-md-4">

          <div className="card text-dark bg-warning shadow-sm">

            <div className="card-body">

              <h5 className="card-title">Total Transactions</h5>

              <h3>{summary.totalTransactions}</h3>

            </div>

          </div>

        </div>

      </div>
      <div className="card shadow-sm">

        <div className="card-body">

          <h5 className="mb-3">

            Users Registered Per Month

          </h5>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={chartData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip />

              <Bar dataKey="total" fill="#0d6efd" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>


    </div>

  );

}