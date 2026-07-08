# Cami Engineering Challenge

This is a small Node.js/TypeScript API used for the Cami engineering hiring challenge.

## Candidate Instructions

Please read `CANDIDATE_BRIEF.md` before starting.

Candidates should clone this public starter repository, create their own private repository, and open a pull request inside that private repository. Do not open a pull request against the central Cami starter repository or submit a public fork.

## Local setup

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Current API

### GET /health

Returns API health.

### POST /requests

Creates a customer request.

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "message": "I need help"
}
```

## Challenge

Implement `POST /requests/classify`.

See `CANDIDATE_BRIEF.md` for full requirements.
