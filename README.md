# QuickNotes System Design

QuickNotes is a learning project that combines a browser-based REST API client with API design, relational data modelling, and a scalable-system architecture proposal.

## Features

- Load up to 10 sample notes with `GET`.
- Create a note with `POST`.
- Delete a note with `DELETE`.
- Loading, success, error, and empty-list feedback.
- Title validation and disabled buttons during requests.
- Safe text rendering with `textContent`.

## Run the API client

1. Clone the repository:

       git clone https://github.com/Lomwag/quicknotes-system-design.git
       cd quicknotes-system-design

2. Open `index.html` in a browser. For a more realistic local workflow, run a static HTTP server from the project directory, for example:

       python -m http.server 8000

   Then open `http://localhost:8000`.

3. Select **Load notes**, create a note, and test the Delete button. An internet connection is needed to reach JSONPlaceholder.

### Important demo limitation

The client uses JSONPlaceholder, a mock REST API. It returns simulated successful responses for create and delete requests, but does not persist those changes on the service. A newly created note may appear in the current page state only; reloading will fetch the original sample data again. The production API described in the docs is a design proposal, not a deployed backend.

## Design documents

- [REST API design](docs/api-design.md)
- [Relational data model and SQL](docs/data-model.md)
- [Architecture, scaling estimates, and trade-offs](docs/architecture.md)

## What I learned

1. How to structure a reusable asynchronous `fetch()` request helper and check `response.ok` before processing a response.
2. How HTTP methods and status codes communicate different operations and outcomes, and why a mock API is different from a persistent backend.
3. How primary keys, foreign keys, unique constraints, indexes, and a junction table preserve relational data integrity.
4. How to estimate average and peak traffic from explicit usage assumptions, and how caches and read replicas introduce freshness trade-offs.
5. Why stateless application servers, health checks, backups, and observability help reduce operational risk.

## Suggested commit sequence

The project is organised into meaningful steps: HTML structure, styling, GET client, API design, data model, architecture, and README. Each step should be committed separately so the history documents the development process.
