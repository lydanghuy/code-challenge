# Scoreboard Module — API Service Specification

**Module:** `scoreboard`
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Architecture Overview](#4-architecture-overview)
5. [API Endpoints](#5-api-endpoints)
6. [Authentication &amp; Authorization](#6-authentication--authorization)
7. [Data Model](#7-data-model)
8. [Real-Time Updates (SSE)](#8-real-time-updates-sse)
9. [Security Controls](#9-security-controls)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)
12. [Scaling Strategy](#12-scaling-strategy)
13. [Implementation Notes](#13-implementation-notes)
14. [Improvement Suggestions](#14-improvement-suggestions)
15. [Glossary](#15-glossary)

---

## 1. Overview

The Scoreboard Module is a backend service responsible for:

- Receiving and validating score-update requests from authenticated users.
- Persisting score changes to the database.
- Broadcasting real-time scoreboard updates to all connected clients via Server-Sent Events (SSE).
- Serving the current top-10 leaderboard via a REST endpoint.

The module sits inside the existing API application server and exposes both REST endpoints and an SSE stream consumed by the frontend.

---

## 2. Functional Requirements

| ID    | Requirement                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | The system must maintain a persistent score record for every registered user.                                                                        |
| FR-02 | A user can submit a score-increment request upon completing a qualifying action.                                                                     |
| FR-03 | The API must validate that the request originates from an authenticated, authorised user before applying any score change.                           |
| FR-04 | The scoreboard endpoint must return the top 10 users ranked by score in descending order.                                                            |
| FR-05 | Any score change that affects the top-10 ranking must be pushed to all subscribed clients in real time (target latency ≤ 500 ms end-to-end).         |
| FR-06 | Score values must never decrease as a result of a standard action submission.                                                                        |
| FR-07 | Each score-increment event must be logged with a timestamp, user ID, increment value, and a unique idempotency key to prevent duplicate submissions. |

---

## 3. Non-Functional Requirements

| ID     | Requirement                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------- |
| NFR-01 | Score-update endpoint P99 latency must be under 200 ms (excluding network).                             |
| NFR-02 | The module must support at least 500 concurrent SSE connections per server instance.                    |
| NFR-03 | All data in transit must use TLS 1.2 or higher.                                                         |
| NFR-04 | The system must be horizontally scalable; real-time fan-out must work across multiple server instances. |
| NFR-05 | Sensitive logs (user IDs, scores) must comply with the project's data-retention policy.                 |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│                                                             │
│   POST /api/scores/increment       GET /api/scores/stream   │
└────────────┬───────────────────────────┬────────────────────┘
             │ HTTPS                     │ HTTPS (SSE)
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API APPLICATION SERVER                   │
│                                                             │
│  ┌──────────────────┐       ┌──────────────────────────┐   │
│  │  Auth Middleware │       │  Scoreboard Controller   │   │
│  │  (JWT Verify)    │──────▶│  - increment score       │   │
│  └──────────────────┘       │  - get top-10            │   │
│                             │  - broadcast update      │   │
│                             └────────────┬─────────────┘   │
│                                          │                  │
│                          ┌───────────────┼───────────────┐  │
│                          ▼               ▼               ▼  │
│                  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│                  │   Score DB   │  │  Redis   │  │  SSE Manager │
│                  │  (Postgres / │  │ Pub/Sub  │  │  (fan-out)   │
│                  │   MySQL)     │  └────┬─────┘  └──────┬───────┘
│                  └──────────────┘       │               │
│                                         └───────────────┘
└─────────────────────────────────────────────────────────────┘
```

> **Note:** In a multi-instance deployment, Redis Pub/Sub decouples score updates from connection management. Each server instance subscribes to the `scoreboard:updates` channel and fans out to its own connected clients, ensuring every subscriber receives the broadcast regardless of which instance handled the write.

---

## 5. API Endpoints

### 5.1 Submit Score Increment

```
POST /api/scores/increment
```

**Description:** Called by the client immediately after a user completes a qualifying action. Increments the authenticated user's score by the specified amount and, if the new ranking affects the top-10, pushes an SSE update to all connected clients.

**Authentication:** Required — Bearer JWT token in `Authorization` header.

**Request Headers:**

| Header            | Required | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| `Authorization`   | Yes      | `Bearer <jwt_token>`                     |
| `Content-Type`    | Yes      | `application/json`                       |
| `Idempotency-Key` | Yes      | UUID v4 generated client-side per action |

**Request Body:**

```json
{
  "increment": 10
}
```

| Field       | Type    | Required | Constraints        | Description                       |
| ----------- | ------- | -------- | ------------------ | --------------------------------- |
| `increment` | integer | Yes      | `1 ≤ value ≤ 1000` | Points to add to the user's score |

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "userId": "usr_abc123",
  "newScore": 340,
  "rank": 7
}
```

**Error Responses:**

| HTTP Status                 | Code                | Description                                             |
| --------------------------- | ------------------- | ------------------------------------------------------- |
| `400 Bad Request`           | `INVALID_INCREMENT` | `increment` is missing, not an integer, or out of range |
| `401 Unauthorized`          | `MISSING_TOKEN`     | No `Authorization` header present                       |
| `401 Unauthorized`          | `INVALID_TOKEN`     | JWT is expired, malformed, or signature mismatch        |
| `409 Conflict`              | `DUPLICATE_REQUEST` | `Idempotency-Key` has already been processed            |
| `429 Too Many Requests`     | `RATE_LIMITED`      | User exceeded the allowed request rate                  |
| `500 Internal Server Error` | `SERVER_ERROR`      | Unexpected error; safe to retry                         |

---

### 5.2 Get Top-10 Scoreboard

```
GET /api/scores/leaderboard
```

**Description:** Returns the current top-10 users by score, queried directly from the database.

**Authentication:** Optional (public endpoint; authenticated requests may receive additional fields such as the caller's own rank).

**Query Parameters:** None required.

**Success Response — `200 OK`:**

```json
{
  "updatedAt": "2026-04-12T08:00:00Z",
  "leaderboard": [
    { "rank": 1, "userId": "usr_xyz", "displayName": "Alice", "score": 9800 },
    { "rank": 2, "userId": "usr_abc", "displayName": "Bob",   "score": 8750 },
    ...
  ]
}
```

---

### 5.3 SSE — Live Scoreboard Feed

```
GET /api/scores/stream
```

**Description:** Establishes a persistent SSE connection over which the server pushes scoreboard update events whenever the top-10 changes.

**Authentication:** Required — JWT passed as query parameter `?token=<jwt>` (the `Authorization` header cannot be set by the browser `EventSource` API).

> **⚠️ Security Warning:** Query-string tokens appear in server access logs, reverse-proxy logs, and browser history. Mitigate by issuing a **short-lived SSE exchange token** (TTL ≤ 60 s) from a dedicated endpoint (e.g. `POST /api/scores/stream-token`) that is called immediately before opening the `EventSource`. Alternatively, deliver the credential via an `HttpOnly` cookie so it never appears in the URL.

**Event payload (JSON):**

```json
{
  "event": "leaderboard_update",
  "payload": {
    "updatedAt": "2026-04-12T08:00:01Z",
    "leaderboard": [ ... ]
  }
}
```

The server sends a heartbeat event (`{"event": "ping"}`) every 30 seconds to keep the connection alive and allow clients to detect stale connections.

---

### 5.4 Health Check

```
GET /health
```

**Description:** Returns the operational status of this service instance. Used by the load balancer to determine whether the instance should receive traffic.

**Authentication:** None.

**Success Response — `200 OK`:**

```json
{
  "status": "ok",
  "uptime": 3821,
  "connections": {
    "sse": 142,
    "db": "ok",
    "redis": "ok"
  }
}
```

**Degraded Response — `503 Service Unavailable`:**

```json
{
  "status": "degraded",
  "reason": "redis_unavailable"
}
```

> The load balancer must remove an instance from rotation within one check cycle of receiving a `503`. The `connections.sse` counter informs auto-scaling systems when an instance is approaching its connection cap (NFR-02).

---

## 6. Authentication & Authorization

### Token Verification

Every mutating request (score increment) passes through the `AuthMiddleware` before reaching the controller:

1. Extract the JWT from the `Authorization: Bearer <token>` header.
2. Verify the token signature against the application's public key / secret.
3. Check the `exp` claim — reject expired tokens.
4. Extract `sub` (user ID) and `roles` claims from the token payload.
5. Confirm the `sub` in the token matches the user the request intends to update. **A user may only increment their own score.**

### Server-Side Score Authority

> **Critical security principle:** The server, not the client, is the authority on score values.

The `increment` field sent by the client represents the number of points earned for the completed action. The allowable range per request is defined server-side (see [Section 9](#9-security-controls)). The server does **not** accept an absolute score value from the client.

---

## 7. Data Model

### `users` table (existing — reference only)

| Column         | Type           | Notes               |
| -------------- | -------------- | ------------------- |
| `id`           | `VARCHAR(36)`  | Primary key, UUID   |
| `display_name` | `VARCHAR(100)` | Public display name |
| `created_at`   | `TIMESTAMP`    | —                   |

### `user_scores` table (new)

| Column       | Type          | Constraints              | Notes            |
| ------------ | ------------- | ------------------------ | ---------------- |
| `user_id`    | `VARCHAR(36)` | **PRIMARY KEY**, FK →`users.id`, NOT NULL | One row per user |
| `score`      | `BIGINT`      | DEFAULT 0, NOT NULL      | Cumulative score |
| `updated_at` | `TIMESTAMP`   | NOT NULL                 | Last update time |

**Index:** `CREATE INDEX idx_score_desc ON user_scores (score DESC);` — supports fast top-10 queries.

### `score_events` table (new — audit log)

| Column            | Type          | Constraints              | Notes                          |
| ----------------- | ------------- | ------------------------ | ------------------------------ |
| `id`              | `VARCHAR(36)` | PK, UUID                 | —                              |
| `idempotency_key` | `VARCHAR(36)` | UNIQUE, NOT NULL         | Prevents duplicate submissions |
| `user_id`         | `VARCHAR(36)` | FK →`users.id`, NOT NULL | —                              |
| `increment`       | `INT`         | NOT NULL                 | Points awarded                 |
| `score_before`    | `BIGINT`      | NOT NULL                 | Score before this event        |
| `score_after`     | `BIGINT`      | NOT NULL                 | Score after this event         |
| `created_at`      | `TIMESTAMP`   | NOT NULL                 | Event time                     |

**Index:** `CREATE UNIQUE INDEX idx_idempotency ON score_events (idempotency_key);`

> **⚠️ Retention Policy:** Without a cleanup strategy this table grows unboundedly, and the idempotency uniqueness check degrades over time. Recommendations:
> - Implement **range partitioning by `created_at` month** so old partitions can be dropped in O(1) without locking the live table.
> - Run a nightly job to archive or delete rows older than the retention window (e.g. 90 days).
> - The idempotency guarantee only needs to span the realistic client-retry window (e.g. 24 h); keys older than that can be safely purged.

---

## 8. Real-Time Updates (SSE)

### Why SSE

SSE is chosen as the sole real-time transport for this module:

- Unidirectional (server → client), which matches the use case exactly — the scoreboard only needs to push, never receive.
- Works natively over HTTP/1.1 and HTTP/2 with no protocol upgrade.
- The browser `EventSource` API handles automatic reconnection transparently.
- No additional proxy or infrastructure configuration needed compared to WebSockets.
- **HTTP/1.1 connection-limit caveat:** Browsers cap connections per origin at 6 under HTTP/1.1; an SSE connection occupies one slot, leaving fewer for regular API calls. HTTP/2 multiplexing removes this constraint. The load balancer and API server **must** advertise HTTP/2 (`h2` ALPN) in production. See [Section 12.2](#122-load-balancer-requirements) for details.

### Flow

1. Client opens a connection to `GET /api/scores/stream`, passing its JWT via `?token=`.
2. The server validates the token and registers the connection in the SSE connection manager.
3. On a successful score increment, the `ScoreboardService` checks whether the updated score changes the top-10 ranking.
4. If the top-10 has changed, the service:
   a. Re-fetches the updated top-10 from the database.
   b. Publishes a `leaderboard_update` message to the `scoreboard:updates` Redis Pub/Sub channel.
5. All server instances subscribed to `scoreboard:updates` receive the message and push it to each of their locally connected SSE clients.

---

## 9. Security Controls

### 9.1 Prevent Unauthorised Score Manipulation

| Control                         | Description                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JWT Authentication**          | All score-increment calls require a valid, non-expired JWT.                                                                                                                 |
| **User-scoped writes**          | The JWT `sub` claim determines whose score is updated. The body payload does not accept a `userId` field.                                                                   |
| **Server-side increment cap**   | The server enforces `1 ≤ increment ≤ MAX_INCREMENT_PER_REQUEST` (configurable, default 100). Values outside this range are rejected with `400`.                             |
| **Idempotency key enforcement** | Each action submission must include a unique `Idempotency-Key` (UUID v4). The key is stored in `score_events`; duplicate keys return `409` without reprocessing.            |
| **Rate limiting**               | Per-user rate limit: max 10 score-increment requests per 60-second sliding window (see[Section 11](#11-rate-limiting)).                                                     |
| **Audit log**                   | Every accepted event is written to `score_events` with `score_before`, `score_after`, and the idempotency key. This creates a tamper-evident chain for detecting anomalies. |
| **HTTPS-only**                  | All endpoints require TLS; HTTP requests are redirected or rejected.                                                                                                        |

### 9.2 Additional Server-Side Validation Checklist

- [ ] Verify JWT expiry (`exp` claim).
- [ ] Verify JWT not used before valid time (`nbf` claim, if present).
- [ ] Confirm `increment` is a positive integer, not a float, not a string.
- [ ] Confirm `increment` does not exceed server-defined maximum.
- [ ] Confirm `Idempotency-Key` header is present and is a valid UUID.
- [ ] Check `Idempotency-Key` has not been previously recorded.

---

## 10. Error Handling

All error responses follow a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before trying again.",
    "retryAfter": 42
  }
}
```

- `code` — machine-readable error code (see Section 5.1).
- `message` — human-readable description (do **not** include internal stack traces or DB details).
- `retryAfter` — seconds until the client may retry (included for `429` responses only).

All unhandled exceptions must be caught, logged internally with a correlation ID, and returned to the client as a generic `500 SERVER_ERROR` — never expose internal error details.

---

## 11. Rate Limiting

The rate limiter is implemented as middleware using a **sliding window counter** stored in Redis.

| Scope                                      | Limit       | Window     |
| ------------------------------------------ | ----------- | ---------- |
| Per-user (authenticated)                   | 10 requests | 60 seconds |
| Per-IP (unauthenticated / leaderboard GET) | 60 requests | 60 seconds |

**Redis key pattern:** `ratelimit:score:usr:{userId}` / `ratelimit:leaderboard:ip:{ipHash}`

When the limit is exceeded, return:

```
HTTP 429 Too Many Requests
Retry-After: <seconds>
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <unix_timestamp>
```

---

## 12. Scaling Strategy

This section describes how to scale the Scoreboard module horizontally. It should be read alongside NFR-04.

### 12.1 Deployment Topology

```
                ┌──────────────────────────────────────┐
                │    Load Balancer  (HTTPS / HTTP/2)   │
                └──────────────┬───────────┬───────────┘
                               │           │
               ┌───────────────┘           └──────────────────┐
               ▼                                              ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│  API Server — Instance 1 │              │  API Server — Instance N │
│  ScoreboardController    │              │  ScoreboardController    │
│  SSE Manager             │    . . .     │  SSE Manager             │
│  (local SSE client pool) │              │  (local SSE client pool) │
└──────────┬───────────────┘              └───────────┬──────────────┘
           │                                          │
           └──────────────────┬───────────────────────┘
                              ▼
          ┌───────────────────────────────────────────┐
          │              Redis Cluster                │
          │  • Pub/Sub channel : scoreboard:updates   │
          │  • Sliding-window rate-limit counters     │
          │  • Idempotency key cache (TTL 24 h)       │
          │  • Leaderboard Sorted Set  (optional)     │
          └──────────────────┬────────────────────────┘
                             │
             ┌───────────────┴──────────────┐
             ▼                              ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Primary DB        │replicate│   Read Replica(s)   │
│  (writes: increment,│────────▶│  (leaderboard GET,  │
│   score_events)     │         │   audit log reads)  │
└─────────────────────┘         └─────────────────────┘
```

> Each API instance fans out independently via Redis Pub/Sub. A client connected to Instance 1 will receive broadcasts produced by Instance N without requiring sticky sessions.

### 12.2 Load Balancer Requirements

| Concern | Recommendation |
| --- | --- |
| **Long-lived SSE connections** | Set idle-connection timeout ≥ 300 s (or disable it). A short TCP idle timeout will silently drop active SSE streams. |
| **Sticky sessions** | **Not required.** Redis Pub/Sub ensures all instances fan out to their local clients. |
| **Protocol** | HTTP/2 (`h2` ALPN) is mandatory in production to eliminate the HTTP/1.1 6-connection-per-host browser limit. |
| **Health checks** | Probe `GET /health` every 10 s; remove an instance after 2 consecutive failures. Re-add after 3 consecutive successes. |

### 12.3 Auto-Scaling Triggers

| Metric | Scale-Out Threshold | Rationale |
| --- | --- | --- |
| CPU utilization | > 70 % sustained 2 min | Standard compute signal |
| Active SSE connections | > 400 per instance | Headroom below the 500-connection cap (NFR-02) |
| Request queue depth | > 100 pending | Instance saturating; add capacity |
| Score-increment P99 latency | > 150 ms | Early warning before NFR-01 breach (200 ms) |

### 12.4 Database Scaling

| Layer | Strategy |
| --- | --- |
| **Connection pooling** | Deploy PgBouncer in transaction-pooling mode. Cap each API instance to a max pool size (default: 20 connections) to prevent exhausting the primary. |
| **Read replicas** | Route all `GET /api/scores/leaderboard` queries to a read replica. Score writes go to the primary only. |
| **Partitioning** | Partition `score_events` by `created_at` (monthly range). Old partitions can be dropped in O(1) without locking. |

### 12.5 Redis Scaling

| Concern | Recommendation |
| --- | --- |
| **High availability** | Redis Sentinel (≥ 2 sentinels) for automatic primary failover in single-region deployments. |
| **High throughput** | Redis Cluster for multi-region or > 10 k RPS. Pin all `scoreboard:*` keys to the same hash slot to keep Pub/Sub on a single shard. |
| **Cold-start after restart** | The Leaderboard Sorted Set is lost on Redis restart. Implement a **startup warm-up job** that re-populates the sorted set from the DB before the instance begins accepting traffic (see also Improvement #2). |

### 12.6 SSE Connection Backpressure

When an instance reaches its SSE connection cap (500, NFR-02):

1. Return `HTTP 503 Service Unavailable` with a `Retry-After` header on new `/stream` requests.
2. Expose the current SSE connection count in `GET /health` so the LB can optionally mark the instance as saturated and route new SSE requests elsewhere.
3. Clients must implement **exponential back-off** (initial delay 1 s, max 30 s) before reconnecting on a `503`.

---

## 13. Implementation Notes

### Atomic Score Update

The score increment must be performed atomically to avoid race conditions when the same user submits multiple requests simultaneously:

```sql
-- Use a single atomic UPDATE + INSERT in a transaction
BEGIN;

INSERT INTO score_events (id, idempotency_key, user_id, increment, score_before, score_after, created_at)
SELECT
  gen_random_uuid(),
  $idempotencyKey,
  $userId,
  $increment,
  COALESCE((SELECT score FROM user_scores WHERE user_id = $userId), 0),
  COALESCE((SELECT score FROM user_scores WHERE user_id = $userId), 0) + $increment,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM score_events WHERE idempotency_key = $idempotencyKey
);

INSERT INTO user_scores (user_id, score, updated_at)
VALUES ($userId, $increment, NOW())
ON CONFLICT (user_id) DO UPDATE
  SET score = user_scores.score + EXCLUDED.score,
      updated_at = NOW();

COMMIT;
```

### Leaderboard Query

```sql
SELECT u.id AS user_id, u.display_name, s.score
FROM user_scores s
JOIN users u ON u.id = s.user_id
ORDER BY s.score DESC
LIMIT 10;
```

With the `idx_score_desc` index, this resolves to an index scan — effectively O(10) for the top-10 fetch.

### Service Layer Structure (Suggested)

```
src/
  modules/
    scoreboard/
      scoreboard.controller.ts   // Route handlers, request parsing
      scoreboard.service.ts      // Business logic (increment, query top-10)
      scoreboard.repository.ts   // DB queries
      scoreboard.pubsub.ts       // Pub/Sub publisher & subscriber
      scoreboard.gateway.ts      // SSE connection manager
      scoreboard.dto.ts          // Request/response DTOs + validation schemas
      scoreboard.middleware.ts   // Auth middleware (or shared)
      scoreboard.spec.ts         // Unit & integration tests
```

---

## 14. Improvement Suggestions

These are architectural enhancements worth considering as the system grows. They are **not required for the initial implementation** but should be kept in mind during design to avoid costly refactors later.

### 💡 1 — Action Verification on the Server

**Current approach:** The client calls the API after completing an action, and the server trusts that the action was genuinely completed.

**Risk:** A malicious user could call `POST /api/scores/increment` directly, bypassing the action entirely. Even with JWT auth, this means any authenticated user can farm points.

**Recommendation:** Introduce a server-side action token flow:

1. When a user starts an action, the server issues a short-lived, signed **action token** (JWT or HMAC, TTL 60–120 s) tied to the user ID and action type.
2. The client submits this token alongside the score-increment request.
3. The server validates and immediately invalidates the token (one-time use, stored in Redis) before applying the score change.

This ensures a score increment can only result from a server-issued action initiation.

---

### 💡 2 — Sorted Set in Redis for O(log n) Leaderboard

Redis `ZADD` / `ZREVRANGE` provides a sorted set that maintains ranking natively. Instead of querying the DB for every top-10 read, keep a Redis Sorted Set (`leaderboard:scores`) as the live source of truth:

```
ZADD leaderboard:scores <score> <userId>    // on every increment
ZREVRANGE leaderboard:scores 0 9 WITHSCORES // top-10 read
```

This eliminates DB reads for leaderboard queries entirely and supports instant rank lookup for any user (`ZREVRANK`).

**Cache consistency considerations:**
- Set a safety-net TTL (e.g. 24 h) on the sorted set so a silent inconsistency bug does not persist forever.
- On Redis restart the sorted set is lost. The startup warm-up job (see [Section 12.5](#125-redis-scaling)) must re-seed it from the DB before the first request is served to avoid a cold-start read storm on the primary.
- The DB remains the source of truth. Run a periodic consistency-check job that compares the top-10 from Redis against the DB and re-seeds if a discrepancy is detected.

---

### 💡 3 — Anomaly Detection / Score Monitoring

Add a background job or stream processor that flags suspicious scoring patterns:

- User increments score more than N times within a short window (beyond the rate limit window).
- Score jumps by an unusually large amount in a single request.
- Multiple accounts incrementing from the same IP address.

Flagged events can trigger account holds, manual review, or automated bans without disrupting legitimate users.

---

### 💡 4 — Graceful SSE Reconnection & State Recovery

When a client reconnects after a dropped SSE connection, it may have missed intermediate updates. Implement the `Last-Event-ID` SSE header pattern:

- Tag each broadcast event with a monotonic `id`.
- On reconnect, the client sends `Last-Event-ID: <lastId>`.
- The server replays any events since that ID (or sends the current leaderboard snapshot if the gap is too large).

---

## 15. Glossary

| Term                | Definition                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Action**          | A user-facing activity whose completion awards points. The nature of the action is outside the scope of this module.      |
| **Idempotency Key** | A UUID generated client-side per action submission. Guarantees that retried network calls do not duplicate a score event. |
| **Increment**       | The number of points to add to a user's score for a single action completion.                                             |
| **Leaderboard**     | The ordered list of the top-10 users by cumulative score.                                                                 |
| **Pub/Sub**         | Redis Publish/Subscribe mechanism used to broadcast score events across multiple server instances.                        |
| **SSE**             | Server-Sent Events — a unidirectional HTTP streaming protocol for server-to-client push.                                  |
| **JWT**             | JSON Web Token — a signed, self-contained token used for authentication.                                                  |
