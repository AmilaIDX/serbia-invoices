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
      const d = inv.date ? new Date(inv.date) : new Date();
      const month = d.getMonth();
      monthly[month] += Number(inv.total || 0);
    });

    const statusCounts = invoices.reduce(
      (acc, inv) => {
        const due = inv.due_date ? new Date(inv.due_date) : null;
        const key =
          (inv.status || "").toLowerCase() ||
          (due && new Date() > due ? "overdue" : "pending");
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
            label: "Monthly revenue",
            data: monthly,
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderRadius: 8,
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
      <div className="card glass" style={{ minHeight: 260 }}>
        <h3 style={{ marginTop: 0 }}>Monthly Revenue</h3>
        <div style={{ height: 200 }}>
          <canvas ref={revenueRef} />
        </div>
      </div>
      <div className="card glass" style={{ minHeight: 260 }}>
        <h3 style={{ marginTop: 0 }}>Invoices by Status</h3>
        <div style={{ height: 200 }}>
          <canvas ref={statusRef} />
        </div>
      </div>
    </div>
  );
};

export default Charts;
