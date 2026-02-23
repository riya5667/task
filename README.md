# Realtime Chat App

A full-stack realtime chat application built with Next.js App Router, Clerk authentication, and Convex for backend state + realtime sync.

## Features

- Clerk-based authentication (sign in / sign up)
- Protected `/chat` route via middleware
- Direct and group conversations
- Realtime message sync (Convex reactive queries)
- Typing indicators
- Online/offline presence
- Unread count tracking with read sync
- Soft-delete for own messages
- Emoji reactions on messages
- Mobile-friendly chat layout

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Clerk (`@clerk/nextjs`)
- Convex (`convex`, `convex/react-clerk`)

## Project Structure

```txt
app/                  # Routes and app shell
components/           # UI and feature components
  chat/               # Chat shell, thread, auth sync
  sidebar/            # Conversation list and discovery
  ui/                 # Shared UI primitives
convex/               # Backend schema, queries, mutations
hooks/                # Reusable client hooks (presence, unread, typing, scroll)
lib/                  # Utilities
middleware.ts         # Clerk route protection
```

## Environment Variables

This project needs environment variables in two places:

1. Frontend (`.env.local`)
2. Convex deployment environment (via `npx convex env set`)

### 1) `.env.local` (frontend)

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-convex-deployment>.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### 2) Convex env (backend)

`convex/auth.config.ts` requires:

```env
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-domain>
```

Set it with:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>
```

For production:

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>
```

## Local Development

Install dependencies:

```bash
npm install
```

Start Convex dev deployment (in one terminal):

```bash
npx convex dev
```

Start Next.js app (in another terminal):

```bash
npm run dev
```

Open:

- `http://localhost:3000` for landing page
- `http://localhost:3000/chat` for chat (requires login)

## Available Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run lint checks
- `npm run typecheck` - Run TypeScript checks

## Clerk Setup Notes

- Configure sign-in/sign-up in Clerk dashboard.
- Ensure your Clerk JWT template is configured for Convex (`applicationID: "convex"` in `convex/auth.config.ts`).
- Add local and production domains in Clerk allowed origins/redirects.

## Deployment

### 1) Deploy Convex backend

```bash
npx convex deploy
```

Set required production backend env:

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>
```

### 2) Deploy Next.js frontend (for example, Vercel)

Set these production env vars in your hosting platform:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Then deploy your app.

### 3) Verify production

- Sign in successfully
- Open `/chat`
- Send messages and reactions
- Confirm unread counts and presence updates
- Watch Convex logs if needed:

```bash
npx convex logs --prod
```

## Troubleshooting

- `Missing NEXT_PUBLIC_CONVEX_URL`
  - Add `NEXT_PUBLIC_CONVEX_URL` to `.env.local` and restart dev server.

- `Missing CLERK_JWT_ISSUER_DOMAIN`
  - Set Convex env var:
    - `npx convex env set CLERK_JWT_ISSUER_DOMAIN ...` (dev)
    - `npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN ...` (prod)

- `error: src refspec main does not match any`
  - Make sure you have an initial commit and correct branch name before pushing.

## License

This project is for educational/demo use. Add a license file if you plan to distribute it publicly.
