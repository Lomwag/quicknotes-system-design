# QuickNotes Architecture and Scaling

## Functional requirements

1. Users can create an account and authenticate.
2. A user can list, view, create, edit, and delete their own notes.
3. Users can create tags and attach multiple tags to notes.
4. The API validates input and returns consistent HTTP status codes and JSON errors.
5. Users cannot read or modify another user's private notes.

## Non-functional requirements

- **Availability:** target 99.9% monthly API availability as an initial service objective.
- **Performance:** target p95 under 300 ms for common cached reads and under 500 ms for ordinary database-backed reads, subject to measurement.
- **Security:** HTTPS, secure password hashing, token/session validation, authorization checks, input validation, rate limits, and managed secrets.
- **Durability:** committed notes must survive application-server restarts and routine infrastructure failures.
- **Scalability:** application servers should be stateless so more instances can be added horizontally.
- **Observability:** central logs, request IDs, metrics, traces, and alerts for latency, errors, queue depth, and database health.
- **Recovery:** automated backups, tested restores, and documented recovery objectives.

## Planning estimates for 1 million registered users

These are explicit planning assumptions, not measured traffic or a guarantee.

- 1,000,000 registered users.
- 10% daily active users = 100,000 active users/day.
- Each active user makes 20 read requests and creates 2 notes per day.
- Each stored note averages about 1 KB including ordinary metadata, before indexes and replicas.
- Peak traffic is estimated at 10 times average traffic to allow for bursts.

| Measure | Calculation | Estimate |
|---|---|---:|
| Read requests/day | 100,000 × 20 | 2,000,000 |
| Average reads/second | 2,000,000 ÷ 86,400 | 23/s |
| Peak reads/second | 23 × 10, rounded | 230/s |
| Note writes/day | 100,000 × 2 | 200,000 |
| Average writes/second | 200,000 ÷ 86,400 | 2.3/s |
| Peak writes/second | 2.3 × 10, rounded | 23/s |
| New note data/year | 200,000 × 365 × 1 KB | about 73 GB/year raw |

The 73 GB/year figure covers only estimated new note records. User and tag data, indexes, replicas, backups, attachments, and operational overhead increase the actual footprint. Budgeting roughly 2–3 times raw note data for primary storage plus indexes/replication gives an initial order-of-magnitude estimate of 146–219 GB/year, excluding backups and attachments. Revisit estimates using real telemetry.

## High-level architecture

    [Browser / Mobile Client]
              |
            [DNS]
              |
       [CDN / WAF / TLS]
              |
        [Load Balancer]
           /       \
    [API Server 1] [API Server 2]  ... add more stateless instances
           \       /
          [Cache: Redis]
              |
       [Primary SQL DB] ───── replication ─────> [Read Replica]
              |
        [Write Queue]
              |
       [Background Worker]
              |
    [Email / export / reminders]

Central monitoring, logs, tracing, secrets management, and alerting apply across the components. The CDN should cache static assets; private note data must not be publicly cached. Authenticated API responses should use careful cache keys and access controls, or bypass shared caching.

## Component responsibilities

- **Client:** renders the interface, validates basic input for usability, and calls the API. Server-side validation remains authoritative.
- **DNS:** resolves the service hostname to the edge entry point.
- **CDN/WAF/TLS:** serves static files close to users, terminates HTTPS at a controlled edge, and filters common malicious traffic.
- **Load balancer:** health-checks API instances and distributes requests across healthy servers.
- **Two or more API servers:** run the same stateless application. Any instance can handle a request; session state is stored in a shared system rather than local memory.
- **Cache:** stores selected frequently requested data or metadata with a TTL. Writes must invalidate or update relevant cache entries; the database remains the source of truth.
- **Primary SQL database:** accepts writes and provides transactional consistency.
- **Read replica:** serves eligible read-heavy queries to reduce pressure on the primary. Replication can lag, so immediately-after-write reads may need the primary.
- **Write queue and worker:** handle slower, retryable side effects such as email, exports, or reminders. A note creation response should not wait for unrelated email delivery.
- **Observability and backups:** capture failures and trends, alert operators, and enable recovery from accidental deletion or infrastructure loss.

## Request flows

### GET /v1/notes

1. The client sends an HTTPS request with its authentication token and optional pagination parameters.
2. DNS resolves the API hostname; the edge layer applies TLS and security filtering.
3. The load balancer routes the request to a healthy API server.
4. The API validates the token and checks that the requested notes belong to that user.
5. The API checks the cache for a correctly user-scoped key. If there is a miss, it queries the database or an appropriate read replica.
6. The API returns a paginated JSON response. The client renders note text as text, not executable HTML.
7. Metrics record latency, status, and request ID without logging private note content or tokens.

### POST /v1/notes

1. The client sends an HTTPS POST with a JSON title and body.
2. The load balancer routes the request to a healthy API server.
3. The API authenticates the user, validates title length/content, and authorizes note creation.
4. The API inserts the note into the primary SQL database inside a transaction and obtains the generated ID.
5. The API invalidates or updates affected cache entries. Any non-critical side effect can be queued for a worker.
6. The API responds with `201 Created`, the new note representation, and optionally a `Location` header.
7. The client adds the returned note to the UI and reports success. If the request times out, an idempotency key can prevent accidental duplicate creation on a retry.

## Trade-offs

1. **Cache speed vs freshness:** caching lowers database load and latency but may return stale data. Use short TTLs, explicit invalidation, user-scoped keys, and read-after-write routing to the primary where needed.
2. **Read replicas vs consistency:** replicas scale reads, but asynchronous replication can lag. Keep critical read-after-write operations on the primary and monitor replica lag.
3. **Queue vs immediate work:** queues isolate slow side effects and support retries, but introduce eventual consistency and more operational complexity. Use them for non-critical work, with idempotent workers and a dead-letter strategy.
4. **SQL constraints vs flexible schema:** relational constraints protect ownership and tag relationships, but schema changes need migrations. Use reviewed migrations and backward-compatible rollout steps.

## Avoiding single points of failure

- Run at least two API instances across separate failure domains and have health checks remove unhealthy instances.
- Use a highly available load balancer, DNS provider, and edge service with documented failover arrangements.
- Deploy the database with automated failover or a managed high-availability configuration; maintain backups and test restore procedures.
- Monitor replication lag and queue depth; make workers retry safely and avoid relying on in-memory job state.
- Store secrets in a managed secret store and keep configuration out of source control.
- Exercise failover and restore plans regularly. A replica is not a substitute for a backup because accidental changes can replicate too.
