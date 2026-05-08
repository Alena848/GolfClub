import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, LayoutDashboard, Send, Users } from "lucide-react";

import { api, WaitlistSignup } from "../api/client";

const initialForm: WaitlistSignup = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  notes: ""
};

export default function HomePage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await api.createWaitlistApplicant(form);
      setForm(initialForm);
      setMessage("You have joined the waitlist. We will notify you when a spot becomes available.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join waitlist.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-layout home-layout">
      <div className="page-heading">
        <p className="eyebrow">Private golf club membership</p>
        <h1>Membership access, waitlist order, and offers in one system.</h1>
        <p>
          Capacity is limited to 50 members. When a member leaves, the longest-waiting
          applicant receives a 7-day offer.
        </p>
      </div>

      <div className="quick-links" aria-label="Application links">
        <Link to="/admin" className="quick-link">
          <LayoutDashboard size={22} />
          <span>Admin</span>
        </Link>
        <Link to="/members" className="quick-link">
          <Users size={22} />
          <span>Members</span>
        </Link>
        <Link to="/waitlist" className="quick-link">
          <ClipboardList size={22} />
          <span>Waitlist</span>
        </Link>
      </div>

      <section className="form-section" aria-labelledby="waitlist-signup-heading">
        <div>
          <p className="eyebrow">Join the waitlist</p>
          <h2 id="waitlist-signup-heading">Sign up for membership consideration</h2>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            First name
            <input
              required
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
          </label>
          <label>
            Last name
            <input
              required
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Phone
            <input
              required
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <label className="full-span">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <Send size={18} />
            {isSubmitting ? "Submitting" : "Sign Up for Waitlist"}
          </button>
        </form>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>
    </section>
  );
}
