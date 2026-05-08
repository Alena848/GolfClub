export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload as T;
}

export type Member = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type: string;
  status: "active" | "inactive" | "resigned";
  join_date: string;
  leave_date: string | null;
  notes: string;
};

export type WaitlistApplicant = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  application_datetime: string;
  status: "waiting" | "offered" | "accepted" | "declined" | "expired";
  notes: string;
  offer_id: number | null;
  offer_status: "pending" | "accepted" | "declined" | "expired" | null;
  offered_at: string | null;
  expires_at: string | null;
};

export type Offer = {
  id: number;
  applicant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "expired";
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
};

export type AdminSummary = {
  membership_capacity: number;
  active_members: number;
  available_spots: number;
  waitlist_count: number;
  pending_offers: number;
  current_offer: (Offer & { first_name: string; last_name: string }) | null;
  recent_activity: Array<{
    id: number;
    entity_type: string;
    action: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
};

export type WaitlistSignup = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes?: string;
};

export type MemberInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type: string;
  join_date: string;
  notes?: string;
};

export const api = {
  getSummary: () => request<AdminSummary>("/admin/summary"),
  getMembers: () => request<Member[]>("/members"),
  createMember: (data: MemberInput) =>
    request<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  resignMember: (memberId: number) =>
    request<Member>(`/members/${memberId}/resign`, { method: "PATCH" }),
  getWaitlist: () => request<WaitlistApplicant[]>("/waitlist"),
  createWaitlistApplicant: (data: WaitlistSignup) =>
    request<WaitlistApplicant>("/waitlist", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  getOffers: () => request<Offer[]>("/offers"),
  acceptOffer: (offerId: number) =>
    request<Member>(`/offers/${offerId}/accept`, { method: "POST" }),
  declineOffer: (offerId: number) =>
    request<Offer>(`/offers/${offerId}/decline`, { method: "POST" })
};
