# Campus Gym frontend

React + TypeScript + Vite + Tailwind CSS v4 + Framer Motion. It talks to the Spring Boot API in this repo.

## Run it

You need Node.js 22.22 or newer.

1. Start the backend on port 8801 (from the repo root): `./mvnw spring-boot:run`, or run `GymManagementApplication` in IntelliJ.
2. Start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open http://localhost:5173.

In development, Vite forwards every `/api/...` request to `http://localhost:8801`, so the browser sees one origin and the `JSESSIONID` login cookie just works. To use a backend on another machine, set `API_TARGET`, e.g. `API_TARGET=http://192.168.1.20:8801 npm run dev`.

Other scripts: `npm run typecheck`, `npm run build` (type-checks, then writes `dist/`), `npm run preview`.

## Where things live

| Path | What |
|---|---|
| `src/styles/theme.css` | **The only place colours, fonts, radii, shadows and motion timings are defined** (Tailwind v4 `@theme`). Tailwind's default palette is switched off, so only the app's own colours exist. |
| `src/api/` | `client.ts` (fetch wrapper, error handling), `endpoints.ts` (one group per Spring controller), `types.ts` (DTO shapes) |
| `src/auth/` | Session login state (`AuthContext`), route guards (`RequireRole`), role helpers |
| `src/components/ui/` | Button, Field/Input/Select/Textarea, Card, Badge, StatCard, PageHeader, Tabs, ChoiceGroup, Dialog/Sheet, DataTable, Feedback (alerts, toasts, progress) |
| `src/components/brand/` | Logo, `ParticleField` (the canvas triangle field), `TrianglePattern` (static pattern for the navy chrome) |
| `src/components/domain/` | Gym-specific pieces: waitlist offer banner, session card, QR scanner, BMI panel, incident progress |
| `src/layouts/` | `AppShell` (navy top bar + sidebar + phone drawer), `AuthLayout` (login/register), `navigation.ts` (menu per role) |
| `src/pages/` | `public/`, `member/`, `trainer/`, `doctor/`, `admin/`, and `staff/` for pages shared by several roles |

## Routes

| Who | Routes |
|---|---|
| Everyone | `/` landing, `/login`, `/register` (logged-in users are sent to their home) |
| Student, university staff | `/member`, `/member/check-in`, `/member/sessions`, `/member/bookings`, `/member/equipment`, `/member/medical`, `/member/fitness`, `/member/incidents` |
| Trainer (admin too) | `/trainer/inside`, `/trainer/check-in`, `/trainer/sessions`, `/trainer/equipment`, `/trainer/loans`, `/trainer/incidents`, `/trainer/fitness` |
| Trainer only | `/trainer` dashboard, `/trainer/qr` |
| Doctor | `/doctor`, `/doctor/clearances`, `/doctor/injuries`, `/doctor/fitness` |
| Admin | `/admin`, `/admin/users`, `/admin/qr` (with reset) |

The backend still checks every request with `@PreAuthorize`; the route guards only keep people on screens they can use.

## Design rules

- Colours and font come from the design reference. The Dala reference is used only for layout, type rhythm and motion (landing page, and small hints in the app).
- One orange action per screen; text on orange is navy.
- All motion is off when the device asks for reduced motion (CSS rule in `theme.css`, `MotionConfig reducedMotion="user"`, and a still frame for the particle canvas).
- Every page works down to 390px wide; tables turn into stacked cards on phones.

## Notes

- The camera QR scanner needs https or `localhost`. On other hosts, members type the code printed under the QR instead.
- New accounts are always students; an admin changes roles on the Users page. A new role applies from the user's next login.
