import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useUser, useAuth } from "../auth/AuthContext";
import { homePath, roleLabel } from "../auth/roles";
import { Logo } from "../components/brand/Logo";
import { TrianglePattern } from "../components/brand/TrianglePattern";
import { Icon } from "../components/ui/Icon";
import { cn } from "../lib/cn";
import { navFor, navLabel, type NavSection } from "./navigation";

/**
 * Authenticated layout from the playbook-screens mockups:
 * 64px navy top bar, 248px navy sidebar, off-white content area.
 * Below 1024px the sidebar becomes a slide-in drawer opened from the top bar.
 */
export function AppShell() {
  const user = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const sections = navFor(user.roleName);

  // Close the drawer whenever the page changes
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <a
        href="#main"
        className="sr-only z-[80] rounded-control bg-orange px-4 py-2 font-bold text-navy focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex h-[60px] items-center overflow-hidden border-b border-white/8 bg-navy text-white lg:h-16">
        <TrianglePattern width={1440} height={64} count={22} seed={11} />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav"
          className="press relative ml-1.5 flex h-11 w-11 items-center justify-center rounded-control text-white hover:bg-white/7 lg:hidden"
        >
          <Icon name="menu" size={22} strokeWidth={2} />
        </button>
        <Link
          to={homePath(user.roleName)}
          className="relative flex items-center px-2 no-underline lg:w-[248px] lg:px-6"
          aria-label="PlayBook home"
        >
          <Logo size="sm" />
        </Link>

        <div className="relative flex flex-1 items-center justify-end gap-5 px-2 sm:px-5 lg:px-8">
          <div className="hidden flex-col items-end gap-0.5 sm:flex">
            <span className="text-[14px] font-bold text-white">{user.name}</span>
            <span className="text-[12px] font-medium text-on-navy-muted">{roleLabel(user.roleName)}</span>
          </div>
          <div aria-hidden="true" className="hidden h-7 w-px bg-white/14 sm:block" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="press flex h-11 items-center gap-2 rounded-control px-3 text-[14px] font-semibold text-white hover:bg-white/7 sm:border sm:border-white/18 sm:px-4"
          >
            <Icon name="logout" size={18} />
            <span className="sr-only sm:not-sr-only">Log out</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4rem)]">
        {/* Navy column runs the full page height; the links stay put while the page scrolls */}
        <div className="hidden w-[248px] shrink-0 self-stretch bg-navy lg:block">
          <nav
            aria-label={navLabel(user.roleName)}
            className="sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden"
          >
            <TrianglePattern width={248} height={900} count={30} seed={5} />
            <div className="relative flex h-full flex-col gap-1 overflow-y-auto px-4 py-5">
              <NavLinks sections={sections} />
            </div>
          </nav>
        </div>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-5 pb-12 outline-none sm:px-8 sm:pt-7 lg:px-12 lg:pt-8">
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-[1200px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sections={sections} userName={user.name} role={roleLabel(user.roleName)} />
    </div>
  );
}

function NavLinks({ sections }: { sections: NavSection[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <div key={i} className={cn("flex flex-col gap-1", i > 0 && "mt-3")}>
          {section.heading && (
            <p className="m-0 px-3.5 pt-2 pb-1 text-label font-bold tracking-eyebrow text-on-navy-muted uppercase">
              {section.heading}
            </p>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "press flex h-11 shrink-0 items-center gap-3 rounded-control px-3.5 text-[14px] no-underline",
                  isActive
                    ? "bg-ocean font-bold text-white hover:text-white"
                    : "font-semibold text-on-navy hover:bg-white/7 hover:text-white",
                )
              }
            >
              <Icon name={item.icon} size={20} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  sections,
  userName,
  role,
}: {
  open: boolean;
  onClose: () => void;
  sections: NavSection[];
  userName: string;
  role: string;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("a,button")?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="lg:hidden">
          <motion.button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy/50"
          />
          <motion.nav
            ref={panelRef}
            id="mobile-nav"
            aria-label="Menu"
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col overflow-hidden bg-navy text-white shadow-drawer"
          >
            <TrianglePattern width={300} height={900} count={30} seed={9} />
            <div className="relative flex h-[60px] items-center justify-between pr-2 pl-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="press flex h-11 w-11 items-center justify-center rounded-control text-white hover:bg-white/7"
              >
                <Icon name="close" size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="relative border-y border-white/8 px-5 py-3">
              <p className="m-0 text-[15px] font-bold">{userName}</p>
              <p className="m-0 text-[13px] text-on-navy-muted">{role}</p>
            </div>
            <div className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3.5 py-4">
              <NavLinks sections={sections} />
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
