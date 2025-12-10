import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const Charts = ({ invoices = [] }) => {
  const revenueRef = useRef(null);
  const statusRef = useRef(null);
  const revenueChart = useRef(null);
  const statusChart = useRef(null);

  useEffect(() => {
    const monthly = Array(12).fill(0);
    invoices.forEach((inv) => {
      const d = inv.issue_date ? new Date(inv.issue_date) : new Date(inv.created_at);
      const month = d.getMonth();
      monthly[month] += Number(inv.total_amount || inv.amount || 0);
    });

    const statusCounts = invoices.reduce(
      (acc, inv) => {
        const key = (inv.status || "pending").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { pending: 0, paid: 0, overdue: 0 }
    );

    if (revenueChart.current) revenueChart.current.destroy();
    if (statusChart.current) statusChart.current.destroy();

    revenueChart.current = new Chart(revenueRef.current, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Monthly revenue (LKR)",
            data: monthly,
            backgroundColor: "#3b82f6",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    statusChart.current = new Chart(statusRef.current, {
      type: "pie",
      data: {
        labels: ["Paid", "Pending", "Overdue"],
        datasets: [
          {
            data: [statusCounts.paid || 0, statusCounts.pending || 0, statusCounts.overdue || 0],
            backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    return () => {
      if (revenueChart.current) revenueChart.current.destroy();
      if (statusChart.current) statusChart.current.destroy();
    };
  }, [invoices]);

  return (
    <div className="grid two">
      <div className="card" style={{ minHeight: 260 }}>
        <h3 style={{ marginTop: 0 }}>Monthly Revenue</h3>
        <div style={{ height: 200 }}>
          <canvas ref={revenueRef} />
        </div>
      </div>
      <div className="card" style={{ minHeight: 260 }}>
        <h3 style={{ marginTop: 0 }}>Invoices by Status</h3>
        <div style={{ height: 200 }}>
          <canvas ref={statusRef} />
        </div>
      </div>
    </div>
  );
};

export default Charts;
