# QuickNotes Data Model

## Entities and relationships

- **users**: one user can own many notes and create many tags.
- **notes**: each note belongs to exactly one user.
- **tags**: each tag belongs to a user, so two users can independently use the same tag name.
- **note_tags**: junction table connecting notes and tags. A note can have many tags and a tag can be applied to many notes.

Relationship summary:

    users 1 ─── * notes
    users 1 ─── * tags
    notes * ─── * tags (through note_tags)

## Tables and columns

### users

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| id | INTEGER | Primary key | Internal user ID |
| email | TEXT | NOT NULL, UNIQUE | Login/contact identifier |
| display_name | TEXT | NOT NULL | Name shown in the UI |
| created_at | TEXT | NOT NULL | UTC timestamp in ISO 8601 format |

### notes

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| id | INTEGER | Primary key | Note ID |
| user_id | INTEGER | NOT NULL, FK to users(id) | Owner |
| title | TEXT | NOT NULL, length 1–100 | Note title |
| body | TEXT | NOT NULL, default empty string | Note content |
| created_at | TEXT | NOT NULL | Creation timestamp |
| updated_at | TEXT | NOT NULL | Last update timestamp |

### tags

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| id | INTEGER | Primary key | Tag ID |
| user_id | INTEGER | NOT NULL, FK to users(id) | Tag owner |
| name | TEXT | NOT NULL | Tag label |

The pair `(user_id, name)` is unique so a user cannot create duplicate tag names.

### note_tags

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| note_id | INTEGER | PK part, FK to notes(id) | Linked note |
| tag_id | INTEGER | PK part, FK to tags(id) | Linked tag |
| added_at | TEXT | NOT NULL | When tag was attached |

The composite primary key `(note_id, tag_id)` prevents attaching the same tag to the same note more than once.

## SQL schema

The following schema targets SQLite. Enable foreign-key enforcement for each connection with `PRAGMA foreign_keys = ON;`.

    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE tags (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, name)
    );

    CREATE TABLE note_tags (
      note_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

## Example queries

### 1. Get a user's newest notes

    SELECT id, title, body, created_at, updated_at
    FROM notes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?;

### 2. Join notes to tags

    SELECT n.id, n.title, t.name AS tag_name
    FROM notes AS n
    JOIN note_tags AS nt ON nt.note_id = n.id
    JOIN tags AS t ON t.id = nt.tag_id
    WHERE n.user_id = ?
    ORDER BY n.id, t.name;

### 3. Count notes per user

    SELECT u.id, u.email, COUNT(n.id) AS note_count
    FROM users AS u
    LEFT JOIN notes AS n ON n.user_id = u.id
    GROUP BY u.id, u.email
    ORDER BY note_count DESC;

## Index

    CREATE INDEX idx_notes_user_created
    ON notes (user_id, created_at DESC);

This composite index helps the common query that filters notes by owner and returns the newest notes first. It can reduce sorting and scanning as the notes table grows. Indexes speed up reads but consume storage and add work to inserts/updates, so index measured query patterns rather than every column.

## SQL vs NoSQL

A relational SQL database (for example PostgreSQL) is the recommended starting point. Notes have clear ownership, foreign-key relationships, uniqueness requirements, and a many-to-many tag relationship. Transactions and constraints help preserve integrity when notes and tags change together. SQL also supports flexible joins and reporting.

A document database could suit a future design where each note is mostly self-contained and schema changes rapidly, but embedding tags into every note can duplicate data and complicate tag updates. At larger scale, a relational primary with read replicas, sensible indexes, caching, and partitioning where justified is a practical first step before considering a different storage model.
