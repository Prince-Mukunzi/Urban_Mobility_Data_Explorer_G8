# Urban Mobility Data Explorer — API Reference

This document describes the HTTP API used by the Urban Mobility dashboard. It covers authentication, trips data endpoints, query parameters, example requests/responses, and common error codes.

Base URL: `http://localhost:3000/api`

Implemented route files: [backend/app/routes/auth.py](backend/app/routes/auth.py), [backend/app/routes/trips.py](backend/app/routes/trips.py)

---

Overview
- Purpose: expose NYC taxi trip data and lightweight user authentication for the dashboard frontend.
- Content: authentication endpoints, trips listing, and dashboard summary endpoints.

Authentication (/auth)
Endpoints in `auth.py` provide basic register/login handlers.

1) Register
- Endpoint: `POST /auth/register`
- Description: create a new user.
- Request body (JSON):

  {
    "username": "student_name",
    "password": "secure_password"
  }

- Success response: `201 Created`

  {
    "message": "User registered successfully"
  }

- Errors:
  - `400 Bad Request` — missing fields or invalid payload
  - `409 Conflict` — username already exists

2) Login
- Endpoint: `POST /auth/login`
- Description: verify credentials and start a session (implementation returns a success message in current codebase).
- Request body (JSON):

  {
    "username": "student_name",
    "password": "secure_password"
  }

- Success response: `200 OK`

  {
    "message": "Login successful"
  }

- Notes: the current routes return simple JSON success messages. If you plan to add JWT or cookie-based sessions, update this section with token formats and example Authorization headers.

Trips endpoints
Routes in `trips.py` expose data used by the dashboard.

1) List trips
- Endpoint: `GET /trips`
- Description: returns a paginated list of trips filtered by query parameters supplied by the UI sidebar.
- Query parameters (optional):
  - `pickup_borough` — filter by pickup borough (e.g., `Manhattan`, `Queens`, `All`)
  - `passenger` — integer, minimum passenger count
  - `page` — integer, page number (default: `1`)

- Example request:

  GET /api/trips?pickup_borough=Manhattan&passenger=2&page=1

- Example response: `200 OK`

  {
    "trips": [
      {
        "no": 12345,
        "pickup_time": "2024-01-01T12:34:56",
        "pickup_zone": "Chelsea",
        "dropoff_zone": "Upper West Side",
        "distance": 2.5,
        "fare": 10.5,
        "total": 13.25
      }
    ],
    "total_pages": 42
  }

- Notes: the code paginates results (per_page configured in server). The UI expects `trips` array and `total_pages` integer.

2) Dashboard summary
- Endpoint: `GET /summary`
- Description: returns aggregated values used for the dashboard top-cards (total trips, average fare, best borough, peak hour).
- Example response: `200 OK`

  {
    "total_trips": "1,234,567",
    "avg_fare": 12.34,
    "best_borough": "Manhattan",
    "peak_hour": "5 PM"
  }

Error handling & status codes
- `200 OK` — successful GETs
- `201 Created` — successful resource creation (e.g., register)

Usage examples (curl)
- Register:

  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"s3cure"}'

- Login:

  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"s3cure"}'

- Fetch trips (example):

  curl "http://localhost:3000/api/trips?pickup_borough=Manhattan&passenger=1&page=1"

Notes & next steps
- The routes currently return simple JSON structures (see the files linked above). If you add authentication tokens, include `Authorization` header examples here.
- Consider adding OpenAPI (Swagger) spec for machine-readable docs and testing.

Contact
- Maintain the docs in `docs/api_docs.md`. For implementation details, see [backend/app/routes](backend/app/routes)

