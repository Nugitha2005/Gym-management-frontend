import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { RedirectIfLoggedIn, RequireRole } from "./auth/RequireRole";
import { ALL_ROLES, MEMBER_ROLES } from "./auth/roles";
import { FullPageLoader, Spinner } from "./components/ui/Spinner";
import { AppShell } from "./layouts/AppShell";
import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

// App screens load on demand, so the public landing page stays light
const MemberHome = lazy(() => import("./pages/member/Home"));
const CheckIn = lazy(() => import("./pages/member/CheckIn"));
const Sessions = lazy(() => import("./pages/member/Sessions"));
const Bookings = lazy(() => import("./pages/member/Bookings"));
const Equipment = lazy(() => import("./pages/member/Equipment"));
const Medical = lazy(() => import("./pages/member/Medical"));
const Fitness = lazy(() => import("./pages/member/Fitness"));
const Incidents = lazy(() => import("./pages/member/Incidents"));

const TrainerDashboard = lazy(() => import("./pages/trainer/Dashboard"));
const Inside = lazy(() => import("./pages/trainer/Inside"));
const DeskCheckIn = lazy(() => import("./pages/trainer/DeskCheckIn"));
const TrainerSessions = lazy(() => import("./pages/trainer/Sessions"));
const TrainerEquipment = lazy(() => import("./pages/trainer/Equipment"));
const Loans = lazy(() => import("./pages/trainer/Loans"));
const IncidentQueue = lazy(() => import("./pages/staff/IncidentQueue"));
const MemberFitness = lazy(() => import("./pages/staff/MemberFitness"));
const GymQr = lazy(() => import("./pages/staff/GymQr"));

const DoctorDashboard = lazy(() => import("./pages/doctor/Dashboard"));
const ClearanceReviews = lazy(() => import("./pages/doctor/ClearanceReviews"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));

/** Scroll to the top on every page change (but let #hash links on the landing page work). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function PageLoader() {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center text-muted">
      <Spinner size={26} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<RedirectIfLoggedIn><Landing /></RedirectIfLoggedIn>} />
          <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
          <Route path="/register" element={<RedirectIfLoggedIn><Register /></RedirectIfLoggedIn>} />

          {/* Everything behind a login shares one app shell; each group then checks the role */}
          <Route element={<RequireRole roles={ALL_ROLES} />}>
            <Route element={<AppShell />}>
              {/* Members: students and university staff */}
              <Route element={<RequireRole roles={MEMBER_ROLES} />}>
                <Route path="/member" element={<Page><MemberHome /></Page>} />
                <Route path="/member/check-in" element={<Page><CheckIn /></Page>} />
                <Route path="/member/sessions" element={<Page><Sessions /></Page>} />
                <Route path="/member/bookings" element={<Page><Bookings /></Page>} />
                <Route path="/member/equipment" element={<Page><Equipment /></Page>} />
                <Route path="/member/medical" element={<Page><Medical /></Page>} />
                <Route path="/member/fitness" element={<Page><Fitness /></Page>} />
                <Route path="/member/incidents" element={<Page><Incidents /></Page>} />
              </Route>

              {/* Trainer tools — the admin uses them too (these endpoints allow TRAINER and ADMIN) */}
              <Route element={<RequireRole roles={["TRAINER", "ADMIN"]} />}>
                <Route path="/trainer/inside" element={<Page><Inside /></Page>} />
                <Route path="/trainer/check-in" element={<Page><DeskCheckIn /></Page>} />
                <Route path="/trainer/sessions" element={<Page><TrainerSessions /></Page>} />
                <Route path="/trainer/equipment" element={<Page><TrainerEquipment /></Page>} />
                <Route path="/trainer/loans" element={<Page><Loans /></Page>} />
                <Route path="/trainer/incidents" element={<Page><IncidentQueue /></Page>} />
                <Route path="/trainer/fitness" element={<Page><MemberFitness /></Page>} />
              </Route>
              <Route element={<RequireRole roles={["TRAINER"]} />}>
                <Route path="/trainer" element={<Page><TrainerDashboard /></Page>} />
                <Route path="/trainer/qr" element={<Page><GymQr /></Page>} />
              </Route>

              <Route element={<RequireRole roles={["DOCTOR"]} />}>
                <Route path="/doctor" element={<Page><DoctorDashboard /></Page>} />
                <Route path="/doctor/clearances" element={<Page><ClearanceReviews /></Page>} />
                <Route path="/doctor/injuries" element={<Page><IncidentQueue /></Page>} />
                <Route path="/doctor/fitness" element={<Page><MemberFitness /></Page>} />
              </Route>

              <Route element={<RequireRole roles={["ADMIN"]} />}>
                <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
                <Route path="/admin/users" element={<Page><AdminUsers /></Page>} />
                <Route path="/admin/qr" element={<Page><GymQr canReset /></Page>} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

/** Keeps the app shell on screen while a lazily loaded page arrives. */
function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
