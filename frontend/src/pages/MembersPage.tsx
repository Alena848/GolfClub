import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, UserMinus } from "lucide-react";

import { api, Member, MemberInput } from "../api/client";
import StatusBadge from "../components/StatusBadge";

const initialMember: MemberInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  membership_type: "Individual",
  join_date: new Date().toISOString().slice(0, 10),
  notes: ""
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState(initialMember);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadMembers() {
    setError("");
    try {
      setMembers(await api.getMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load members.");
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase();
    return members.filter((member) =>
      `${member.first_name} ${member.last_name} ${member.email} ${member.status}`
        .toLowerCase()
        .includes(term)
    );
  }, [members, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const member = await api.createMember(form);
      setMembers((current) => [member, ...current]);
      setForm(initialMember);
      setMessage("Member added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add member.");
    }
  }

  async function handleResign(memberId: number) {
    setError("");
    setMessage("");
    try {
      const updated = await api.resignMember(memberId);
      setMembers((current) => current.map((member) => (member.id === memberId ? updated : member)));
      setMessage("Member marked as resigned. If waitlist applicants exist, the next offer was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resign member.");
    }
  }

  return (
    <section className="page-layout">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Members</p>
          <h1>Current and former members</h1>
        </div>
        <button className="secondary-button" onClick={loadMembers}>
          <RefreshCcw size={17} />
          Refresh
        </button>
      </div>

      <section className="form-section">
        <div className="section-heading">
          <h2>Add member</h2>
          <Plus size={18} />
        </div>
        <form className="form-grid" onSubmit={handleCreate}>
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
          <label>
            Membership type
            <select
              value={form.membership_type}
              onChange={(event) => setForm({ ...form, membership_type: event.target.value })}
            >
              <option>Individual</option>
              <option>Family</option>
              <option>Corporate</option>
            </select>
          </label>
          <label>
            Join date
            <input
              required
              type="date"
              value={form.join_date}
              onChange={(event) => setForm({ ...form, join_date: event.target.value })}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            Add Member
          </button>
        </form>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="table-section">
        <div className="table-toolbar">
          <h2>Member list</h2>
          <input
            className="search-input"
            placeholder="Search members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Join date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.first_name} {member.last_name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{member.membership_type}</td>
                  <td>{member.join_date}</td>
                  <td><StatusBadge status={member.status} /></td>
                  <td>
                    {member.status === "active" ? (
                      <button className="icon-button danger" onClick={() => handleResign(member.id)} title="Mark resigned">
                        <UserMinus size={17} />
                      </button>
                    ) : (
                      <span className="muted">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
