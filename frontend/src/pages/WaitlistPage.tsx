import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCcw, X } from "lucide-react";

import { api, Offer, WaitlistApplicant } from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function WaitlistPage() {
  const [applicants, setApplicants] = useState<WaitlistApplicant[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setError("");
    try {
      const [waitlistData, offersData] = await Promise.all([api.getWaitlist(), api.getOffers()]);
      setApplicants(waitlistData);
      setOffers(offersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load waitlist.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const pendingOffers = useMemo(() => offers.filter((offer) => offer.status === "pending"), [offers]);

  async function handleAccept(offerId: number) {
    setError("");
    setMessage("");
    try {
      await api.acceptOffer(offerId);
      setMessage("Offer accepted. Applicant is now an active member.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept offer.");
    }
  }

  async function handleDecline(offerId: number) {
    setError("");
    setMessage("");
    try {
      await api.declineOffer(offerId);
      setMessage("Offer declined. The next longest-waiting applicant was notified if a spot remains open.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to decline offer.");
    }
  }

  return (
    <section className="page-layout">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Waitlist & Offers</p>
          <h1>Applicants ordered by application date and time</h1>
        </div>
        <button className="secondary-button" onClick={loadData}>
          <RefreshCcw size={17} />
          Refresh
        </button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="content-band">
        <div className="section-heading">
          <h2>Pending offers</h2>
          <span>{pendingOffers.length}</span>
        </div>
        {pendingOffers.length > 0 ? (
          <div className="offer-grid">
            {pendingOffers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                <div>
                  <strong>{offer.first_name} {offer.last_name}</strong>
                  <span>{offer.email}</span>
                  <span>Expires {new Date(offer.expires_at).toLocaleString()}</span>
                </div>
                <div className="button-row">
                  <button className="primary-button compact" onClick={() => handleAccept(offer.id)}>
                    <Check size={17} />
                    Accept
                  </button>
                  <button className="secondary-button compact danger-outline" onClick={() => handleDecline(offer.id)}>
                    <X size={17} />
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No pending offers.</p>
        )}
      </section>

      <section className="table-section">
        <div className="table-toolbar">
          <h2>Waitlist</h2>
          <span className="muted">Oldest application appears first</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Application date and time</th>
                <th>Status</th>
                <th>Offer</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant, index) => (
                <tr key={applicant.id}>
                  <td>{index + 1}</td>
                  <td>{applicant.first_name} {applicant.last_name}</td>
                  <td>{applicant.email}</td>
                  <td>{applicant.phone}</td>
                  <td>{new Date(applicant.application_datetime).toLocaleString()}</td>
                  <td><StatusBadge status={applicant.status} /></td>
                  <td>{applicant.offer_status ? <StatusBadge status={applicant.offer_status} /> : <span className="muted">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
