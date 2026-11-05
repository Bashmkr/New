# Cyber Safety Gallery

A virtual 3D art exhibition for **The Riyadh Schools – Al Malqa**, showing original student artwork created for Cybersecurity Awareness Month.

- **Visitors:** welcome page → navigable 3D gallery (24 × 30 × 7 m) with five areas, framed artwork, spotlights, and a click-to-view artwork window. Works with mouse, keyboard, and touch (joystick + tap-to-walk).
- **Staff:** `/staff` dashboard to upload (drag-and-drop, multiple files, preview), edit, delete, publish/unpublish artwork, and manage teacher accounts.

## Tech

Next.js (App Router) · React Three Fiber / Three.js · Tailwind CSS · Supabase (Auth, Postgres, private Storage).

## How security works

| Who | Can do |
|---|---|
| Public visitor | See **published** artwork only, via `get_published_artworks()`. Student first name is returned only when a teacher ticked permission. No access to tables, pending files, or uploads. |
| Contributor | Upload artwork (always saved as *pending*), edit/delete **own** artwork. Editing a published artwork sends it back to review. Cannot publish. |
| Administrator | Everything: review and publish, edit/delete any artwork, set display order, add/remove contributor accounts. |

Rules are enforced in the database (row-level security + triggers) and storage policies, not only in the UI. Files live in a **private** bucket; visitors receive short-lived signed links for published artwork only. The secret service-role key is used only by the server route `/api/staff`.

The **first account** created in the Supabase project automatically becomes the administrator. Every later account is a contributor.

## Setup

1. Create a Supabase project.
2. Supabase → **SQL Editor** → paste and run `supabase/migrations/20261105000000_gallery.sql`.
3. Supabase → **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (staff accounts are created by the admin).
4. Supabase → **Authentication → Users → Add user**: create the administrator account (email + password, auto-confirm). This first user becomes admin.
5. Copy `.env.example` to `.env.local` and fill in the values (Project Settings → API).
6. `npm install && npm run dev`, then open `http://localhost:3000` and `/staff`.

## Deploy (Vercel)

Import the GitHub repository in Vercel and add the three environment variables from `.env.example` (the service-role key only as a server variable). Deploy.

## Gallery layout

Frame positions are defined in `src/components/gallery/layout.ts`: 38 frames each for Digital Privacy and Think Before You Post (outer wall, centre partition, a freestanding middle wall, then upper rows), and 19 featured frames for Cyber Heroes. Extra frames only appear once artwork fills them. Published artwork fills frames in display order; the dashboard shows how many frames each area has left.

## Local development with a local Supabase

`npx supabase start` runs the full stack in Docker and applies the migration automatically.
