import { useEffect, useState } from "react";
import { AlertCircle, Clock, RefreshCcw } from "lucide-react";

import { AdminSummary, api } from "../api/client";
import EmptyState from "../components/EmptyState";

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummary() {
    setError("");
    try {
      setSummary(await api.getSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin summary.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (isLoading) {
    return <section className="page-layout">Loading admin data...</section>;
  }

  if (error) {
    return <section className="page-layout error-message">{error}</section>;
  }

  if (!summary) {
    return null;
  }

  const occupiedPercent = Math.round((summary.active_members / summary.membership_capacity) * 100);

  return (
    <section className="page-layout">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Club operations</h1>
        </div>
        <button className="secondary-button" onClick={loadSummary}>
          <RefreshCcw size={17} />
          Refresh
        </button>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Capacity</span>
          <strong>{summary.membership_capacity}</strong>
        </article>
        <article className="metric-card">
          <span>Active members</span>
          <strong>{summary.active_members}</strong>
        </article>
        <article className="metric-card">
          <span>Available spots</span>
          <strong>{summary.available_spots}</strong>
        </article>
        <article className="metric-card">
          <span>Waitlist</span>
          <strong>{summary.waitlist_count}</strong>
        </article>
      </div>

      <section className="content-band">
        <div className="section-heading">
          <h2>Membership capacity</h2>
          <span>{occupiedPercent}% occupied</span>
        </div>
        <div className="capacity-bar" aria-label={`${occupiedPercent}% occupied`}>
          <span style={{ width: `${occupiedPercent}%` }} />
        </div>
      </section>

      <section className="split-layout">
        <div className="content-band">
          <div className="section-heading">
            <h2>Current offer</h2>
            <Clock size={18} />
          </div>
          {summary.current_offer ? (
            <div className="offer-summary">
              <strong>
                {summary.current_offer.first_name} {summary.current_offer.last_name}
              </strong>
              <span>{summary.current_offer.email}</span>
              <span>Expires {new Date(summary.current_offer.expires_at).toLocaleString()}</span>
            </div>
          ) : (
            <EmptyState title="No pending offer" detail="A new offer will be sent when a spot opens." />
          )}
        </div>

        <div className="content-band">
          <div className="section-heading">
            <h2>Recent activity</h2>
            <AlertCircle size={18} />
          </div>
          {summary.recent_activity.length > 0 ? (
            <ul className="activity-list">
              {summary.recent_activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.action.replaceAll("_", " ")}</strong>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet" detail="Member and waitlist actions will appear here." />
          )}
        </div>
      </section>
    </section>
  );
}
