import os
import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from flask import Flask, jsonify, request
from flask_cors import CORS

from app.db import get_connection


app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))


def to_json(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, list):
        return [to_json(item) for item in value]
    if isinstance(value, dict):
        return {key: to_json(item) for key, item in value.items()}
    return value


def json_response(payload, status=200):
    return jsonify(to_json(payload)), status


def fetch_one(cursor, sql, params=()):
    cursor.execute(sql, params)
    return cursor.fetchone()


def fetch_all(cursor, sql, params=()):
    cursor.execute(sql, params)
    return cursor.fetchall()


def settings(cursor):
    return fetch_one(cursor, "SELECT * FROM club_settings WHERE id = 1")


def active_member_count(cursor):
    row = fetch_one(cursor, "SELECT COUNT(*) AS count FROM members WHERE status = 'active'")
    return row["count"]


def pending_offer_count(cursor):
    row = fetch_one(cursor, "SELECT COUNT(*) AS count FROM membership_offers WHERE status = 'pending'")
    return row["count"]


def log_activity(cursor, entity_type, entity_id, action, details=None):
    cursor.execute(
        """
        INSERT INTO activity_log (entity_type, entity_id, action, details)
        VALUES (%s, %s, %s, %s::jsonb)
        """,
        (entity_type, entity_id, action, json.dumps(details or {})),
    )


def dispatch_membership_offers(cursor):
    club = settings(cursor)
    deadline_days = club["offer_deadline_days"]

    while active_member_count(cursor) + pending_offer_count(cursor) < club["membership_capacity"]:
        applicant = fetch_one(
            cursor,
            """
            SELECT *
            FROM waitlist_applicants
            WHERE status = 'waiting'
            ORDER BY application_datetime ASC, id ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """,
        )
        if not applicant:
            return

        offer = fetch_one(
            cursor,
            """
            INSERT INTO membership_offers (applicant_id, expires_at)
            VALUES (%s, NOW() + (%s * INTERVAL '1 day'))
            RETURNING *
            """,
            (applicant["id"], deadline_days),
        )
        cursor.execute(
            """
            UPDATE waitlist_applicants
            SET status = 'offered', updated_at = NOW()
            WHERE id = %s
            """,
            (applicant["id"],),
        )
        cursor.execute(
            """
            INSERT INTO notifications (applicant_id, offer_id, recipient, subject, body)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                applicant["id"],
                offer["id"],
                applicant["email"],
                "Golf club membership spot available",
                "A membership spot is available. Please accept or decline within 7 days.",
            ),
        )
        log_activity(
            cursor,
            "offer",
            offer["id"],
            "offer_sent",
            {"applicant_id": applicant["id"], "expires_at": offer["expires_at"].isoformat()},
        )


def expire_pending_offers(cursor):
    expired = fetch_all(
        cursor,
        """
        UPDATE membership_offers
        SET status = 'expired', responded_at = NOW()
        WHERE status = 'pending' AND expires_at <= NOW()
        RETURNING *
        """,
    )
    for offer in expired:
        cursor.execute(
            """
            UPDATE waitlist_applicants
            SET status = 'expired', updated_at = NOW()
            WHERE id = %s
            """,
            (offer["applicant_id"],),
        )
        log_activity(cursor, "offer", offer["id"], "offer_expired", {"applicant_id": offer["applicant_id"]})

    if expired:
        dispatch_membership_offers(cursor)


@app.before_request
def keep_offer_queue_current():
    if request.path.startswith("/api/") and request.path != "/api/health":
        with get_connection() as conn:
            with conn.cursor() as cursor:
                expire_pending_offers(cursor)


@app.get("/api/health")
def health():
    return json_response({"status": "ok"})


@app.get("/api/admin/summary")
def admin_summary():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            club = settings(cursor)
            active_count = active_member_count(cursor)
            waitlist_count = fetch_one(
                cursor,
                "SELECT COUNT(*) AS count FROM waitlist_applicants WHERE status IN ('waiting', 'offered')",
            )["count"]
            current_offer = fetch_one(
                cursor,
                """
                SELECT o.*, a.first_name, a.last_name, a.email
                FROM membership_offers o
                JOIN waitlist_applicants a ON a.id = o.applicant_id
                WHERE o.status = 'pending'
                ORDER BY o.expires_at ASC
                LIMIT 1
                """,
            )
            recent_activity = fetch_all(
                cursor,
                """
                SELECT *
                FROM activity_log
                ORDER BY created_at DESC
                LIMIT 8
                """,
            )
            return json_response(
                {
                    "membership_capacity": club["membership_capacity"],
                    "active_members": active_count,
                    "available_spots": max(club["membership_capacity"] - active_count, 0),
                    "waitlist_count": waitlist_count,
                    "pending_offers": pending_offer_count(cursor),
                    "current_offer": current_offer,
                    "recent_activity": recent_activity,
                }
            )


@app.get("/api/members")
def list_members():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            rows = fetch_all(
                cursor,
                """
                SELECT *
                FROM members
                ORDER BY status ASC, last_name ASC, first_name ASC
                """,
            )
            return json_response(rows)


@app.post("/api/members")
def create_member():
    data = request.get_json() or {}
    required = ["first_name", "last_name", "email", "phone", "join_date"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return json_response({"error": f"Missing required fields: {', '.join(missing)}"}, 400)

    with get_connection() as conn:
        with conn.cursor() as cursor:
            if active_member_count(cursor) >= settings(cursor)["membership_capacity"]:
                return json_response({"error": "Membership capacity is full."}, 409)
            member = fetch_one(
                cursor,
                """
                INSERT INTO members (first_name, last_name, email, phone, membership_type, status, join_date, notes)
                VALUES (%s, %s, %s, %s, %s, 'active', %s, %s)
                RETURNING *
                """,
                (
                    data["first_name"],
                    data["last_name"],
                    data["email"],
                    data["phone"],
                    data.get("membership_type", "Individual"),
                    data["join_date"],
                    data.get("notes", ""),
                ),
            )
            log_activity(cursor, "member", member["id"], "member_created", {"email": member["email"]})
            return json_response(member, 201)


@app.patch("/api/members/<int:member_id>/resign")
def resign_member(member_id):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            member = fetch_one(
                cursor,
                """
                UPDATE members
                SET status = 'resigned', leave_date = CURRENT_DATE, updated_at = NOW()
                WHERE id = %s AND status = 'active'
                RETURNING *
                """,
                (member_id,),
            )
            if not member:
                return json_response({"error": "Active member not found."}, 404)

            log_activity(cursor, "member", member["id"], "member_resigned", {"email": member["email"]})
            dispatch_membership_offers(cursor)
            return json_response(member)


@app.get("/api/waitlist")
def list_waitlist():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            applicants = fetch_all(
                cursor,
                """
                SELECT a.*,
                       o.id AS offer_id,
                       o.status AS offer_status,
                       o.offered_at,
                       o.expires_at
                FROM waitlist_applicants a
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM membership_offers
                    WHERE applicant_id = a.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) o ON TRUE
                ORDER BY a.application_datetime ASC, a.id ASC
                """,
            )
            return json_response(applicants)


@app.post("/api/waitlist")
def create_waitlist_applicant():
    data = request.get_json() or {}
    required = ["first_name", "last_name", "email", "phone"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return json_response({"error": f"Missing required fields: {', '.join(missing)}"}, 400)

    with get_connection() as conn:
        with conn.cursor() as cursor:
            applicant = fetch_one(
                cursor,
                """
                INSERT INTO waitlist_applicants
                  (first_name, last_name, email, phone, application_datetime, notes)
                VALUES (%s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()), %s)
                RETURNING *
                """,
                (
                    data["first_name"],
                    data["last_name"],
                    data["email"],
                    data["phone"],
                    data.get("application_datetime"),
                    data.get("notes", ""),
                ),
            )
            log_activity(cursor, "waitlist", applicant["id"], "waitlist_signup", {"email": applicant["email"]})
            dispatch_membership_offers(cursor)
            return json_response(applicant, 201)


@app.get("/api/offers")
def list_offers():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            offers = fetch_all(
                cursor,
                """
                SELECT o.*, a.first_name, a.last_name, a.email
                FROM membership_offers o
                JOIN waitlist_applicants a ON a.id = o.applicant_id
                ORDER BY o.created_at DESC
                """,
            )
            return json_response(offers)


@app.post("/api/offers/<int:offer_id>/decline")
def decline_offer(offer_id):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            offer = fetch_one(
                cursor,
                """
                UPDATE membership_offers
                SET status = 'declined', responded_at = NOW()
                WHERE id = %s AND status = 'pending'
                RETURNING *
                """,
                (offer_id,),
            )
            if not offer:
                return json_response({"error": "Pending offer not found."}, 404)

            cursor.execute(
                """
                UPDATE waitlist_applicants
                SET status = 'declined', updated_at = NOW()
                WHERE id = %s
                """,
                (offer["applicant_id"],),
            )
            log_activity(cursor, "offer", offer["id"], "offer_declined", {"applicant_id": offer["applicant_id"]})
            dispatch_membership_offers(cursor)
            return json_response(offer)


@app.post("/api/offers/<int:offer_id>/accept")
def accept_offer(offer_id):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            offer = fetch_one(
                cursor,
                """
                SELECT o.*, a.first_name, a.last_name, a.email, a.phone, a.notes
                FROM membership_offers o
                JOIN waitlist_applicants a ON a.id = o.applicant_id
                WHERE o.id = %s AND o.status = 'pending' AND o.expires_at > NOW()
                FOR UPDATE
                """,
                (offer_id,),
            )
            if not offer:
                return json_response({"error": "Active pending offer not found."}, 404)
            if active_member_count(cursor) >= settings(cursor)["membership_capacity"]:
                return json_response({"error": "No membership spot is currently available."}, 409)

            member = fetch_one(
                cursor,
                """
                INSERT INTO members (first_name, last_name, email, phone, membership_type, status, join_date, notes)
                VALUES (%s, %s, %s, %s, 'Individual', 'active', CURRENT_DATE, %s)
                RETURNING *
                """,
                (offer["first_name"], offer["last_name"], offer["email"], offer["phone"], offer["notes"]),
            )
            cursor.execute(
                """
                UPDATE membership_offers
                SET status = 'accepted', responded_at = NOW()
                WHERE id = %s
                """,
                (offer_id,),
            )
            cursor.execute(
                """
                UPDATE waitlist_applicants
                SET status = 'accepted', updated_at = NOW()
                WHERE id = %s
                """,
                (offer["applicant_id"],),
            )
            log_activity(cursor, "offer", offer_id, "offer_accepted", {"member_id": member["id"]})
            return json_response(member, 201)
