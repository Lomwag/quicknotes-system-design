# QuickNotes REST API Design

## Base URL and conventions

The proposed production API base URL is `https://api.example.com/v1`. The browser demo uses JSONPlaceholder at `https://jsonplaceholder.typicode.com/posts`, which is a testing service and does not persist POST or DELETE changes.

- Request and response bodies use JSON.
- Authenticated endpoints require a bearer access token.
- IDs are server-generated.
- List endpoints should support pagination and return stable ordering.
- Example payloads below describe the proposed QuickNotes API, not the JSONPlaceholder demo.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| GET | `/v1/notes` | List the signed-in user's notes; supports `limit` and `cursor` | 200 OK |
| GET | `/v1/notes/{noteId}` | Retrieve one note owned by the user | 200 OK |
| POST | `/v1/notes` | Create a note | 201 Created |
| PATCH | `/v1/notes/{noteId}` | Update one or more note fields | 200 OK |
| DELETE | `/v1/notes/{noteId}` | Delete a note | 204 No Content |
| GET | `/v1/tags` | List tags available to the signed-in user | 200 OK |
| POST | `/v1/notes/{noteId}/tags` | Attach a tag to a note | 201 Created |

## List notes example

Request:

    GET /v1/notes?limit=2
    Authorization: Bearer <access-token>

Response — `200 OK`:

    {
      "data": [
        {
          "id": "note_102",
          "title": "Plan the week",
          "body": "Finish the API assignment",
          "createdAt": "2026-10-11T07:00:00Z",
          "updatedAt": "2026-10-11T07:00:00Z",
          "tags": ["study"]
        },
        {
          "id": "note_101",
          "title": "Read REST notes",
          "body": "Review status codes",
          "createdAt": "2026-10-10T16:30:00Z",
          "updatedAt": "2026-10-10T16:30:00Z",
          "tags": []
        }
      ],
      "page": {
        "limit": 2,
        "nextCursor": "eyJpZCI6MTAxfQ"
      }
    }

## Create note example

Request:

    POST /v1/notes
    Authorization: Bearer <access-token>
    Content-Type: application/json

    {
      "title": "Read REST notes",
      "body": "Review status codes"
    }

Response — `201 Created`:

    {
      "data": {
        "id": "note_103",
        "title": "Read REST notes",
        "body": "Review status codes",
        "createdAt": "2026-10-11T08:15:00Z",
        "updatedAt": "2026-10-11T08:15:00Z",
        "tags": []
      }
    }

## Error responses

Use a consistent structure so clients can show useful messages without exposing internal implementation details.

| Status | Meaning | Typical cause |
|---|---|---|
| 400 Bad Request | Invalid input | Missing title, malformed JSON, title over 100 characters |
| 401 Unauthorized | Authentication required or invalid | Missing, expired, or invalid access token |
| 403 Forbidden | Authenticated but not allowed | User attempts an action outside their permissions |
| 404 Not Found | Resource does not exist or is not visible to this user | Unknown note ID |
| 500 Internal Server Error | Unexpected server failure | Unhandled application or database error |

Example — `400 Bad Request`:

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "The title is required and must be 100 characters or fewer.",
        "details": [
          { "field": "title", "issue": "required" }
        ],
        "requestId": "req_7f31"
      }
    }

Do not return stack traces, SQL errors, access tokens, or private data in error responses. Log diagnostic details server-side with a request ID.
