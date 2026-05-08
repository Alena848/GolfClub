# Golf Club Membership App

Three-tier Dockerized app for private golf club membership operations.

## Stack

- Postgres database
- Flask backend API
- React + TypeScript + Vite frontend

## Run

```sh
docker compose up --build
```

Then open:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:5001/api
```

Postgres is exposed on your Mac at:

```text
localhost:5433
```

Inside Docker, the backend still connects to Postgres at:

```text
db:5432
```

## Default Business Rules

- Membership capacity is 50.
- The seed migration creates 50 active members.
- When an active member leaves, one spot opens.
- The backend offers that spot to the waitlist applicant who has waited the longest.
- Offers expire after 7 days.
- Expired or declined offers automatically move to the next longest-waiting applicant.
