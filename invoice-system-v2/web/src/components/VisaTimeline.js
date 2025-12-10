import { useMemo } from "react";

const steps = ["submitted_to_lawyer", "submitted_for_visa", "approved", "rejected", "resubmitted"];

const labels = {
  submitted_to_lawyer: "Submitted to lawyer",
  submitted_for_visa: "Submitted for visa",
  approved: "Visa issued",
  rejected: "Rejected",
  resubmitted: "Resubmitted",
};

const VisaTimeline = ({ timeline = {}, onUpdate }) => {
  const sorted = useMemo(
    () =>
      steps
        .map((key) => ({ key, date: timeline[key] || "" }))
        .filter(Boolean),
    [timeline]
  );

  const message = useMemo(() => {
    if (timeline.approved) {
      return `Great news! Your visa was issued on ${timeline.approved}.`;
    }
    if (timeline.rejected) {
      return `We’re sorry. The visa was rejected on ${timeline.rejected}. We'll plan next steps.`;
    }
    if (timeline.submitted_for_visa) {
      return `Your application was submitted on ${timeline.submitted_for_visa}. We'll notify you when a decision arrives.`;
    }
    if (timeline.submitted_to_lawyer) {
      return `Documents were submitted to the lawyer on ${timeline.submitted_to_lawyer}. Preparing for visa submission.`;
    }
    return "";
  }, [timeline]);

  const setDate = (key, value) => onUpdate?.({ ...timeline, [key]: value || undefined });

  const daysBetween = (from) => {
    if (!from) return "-";
    const start = new Date(from);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return `${diff} days`;
  };

  return (
    <div className="card grid">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Visa Timeline</h3>
        <div className="pill">From latest step: {daysBetween(timeline.approved || timeline.rejected || timeline.submitted_for_visa || timeline.submitted_to_lawyer)}</div>
      </div>
      <div className="form-grid">
        {sorted.map(({ key, date }) => (
          <div className="form-control" key={key}>
            <label>{labels[key]}</label>
            <input type="date" value={date || ""} onChange={(e) => setDate(key, e.target.value)} />
            {date && <div className="muted">Elapsed: {daysBetween(date)}</div>}
          </div>
        ))}
      </div>
      {message && (
        <div className="card" style={{ background: "var(--panel-alt)" }}>
          <div className="muted" style={{ marginBottom: 6 }}>Client message</div>
          <div style={{ fontWeight: 600 }}>{message}</div>
        </div>
      )}
    </div>
  );
};

export default VisaTimeline;
