import type { RoleName } from "../api/types";
import type { IconName } from "../components/ui/Icon";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Match the path exactly (dashboard/home links). */
  end?: boolean;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

const member: NavSection[] = [
  {
    items: [
      { to: "/member", label: "Home", icon: "home", end: true },
      { to: "/member/check-in", label: "Check in", icon: "scan" },
      { to: "/member/sessions", label: "Sessions", icon: "calendar" },
      { to: "/member/bookings", label: "My bookings", icon: "bookmark" },
      { to: "/member/equipment", label: "Equipment", icon: "ball" },
      { to: "/member/medical", label: "Medical clearance", icon: "shieldPlus" },
      { to: "/member/fitness", label: "Fitness profile", icon: "pulse" },
      { to: "/member/incidents", label: "Incidents", icon: "warning" },
    ],
  },
];

// Trainer tools are shared with the admin (the backend allows TRAINER and ADMIN on these endpoints)
const trainerTools: NavItem[] = [
  { to: "/trainer/inside", label: "Who’s inside", icon: "people" },
  { to: "/trainer/check-in", label: "Check in a member", icon: "idCard" },
  { to: "/trainer/sessions", label: "Sessions", icon: "calendar" },
  { to: "/trainer/equipment", label: "Equipment", icon: "ball" },
  { to: "/trainer/loans", label: "Loans", icon: "swap" },
  { to: "/trainer/incidents", label: "Incident queue", icon: "warning" },
  { to: "/trainer/fitness", label: "Member fitness", icon: "pulse" },
];

const trainer: NavSection[] = [
  {
    items: [
      { to: "/trainer", label: "Dashboard", icon: "grid", end: true },
      ...trainerTools,
      { to: "/trainer/qr", label: "Gym QR code", icon: "qr" },
    ],
  },
];

const doctor: NavSection[] = [
  {
    items: [
      { to: "/doctor", label: "Dashboard", icon: "grid", end: true },
      { to: "/doctor/clearances", label: "Clearance reviews", icon: "shieldCheck" },
      { to: "/doctor/injuries", label: "Injury queue", icon: "cross" },
      { to: "/doctor/fitness", label: "Member fitness", icon: "pulse" },
    ],
  },
];

const admin: NavSection[] = [
  {
    items: [
      { to: "/admin", label: "Dashboard", icon: "grid", end: true },
      { to: "/admin/users", label: "Users", icon: "usersCog" },
    ],
  },
  { heading: "Trainer tools", items: trainerTools },
  { items: [{ to: "/admin/qr", label: "Gym QR code", icon: "qr" }] },
];

export function navFor(role: RoleName): NavSection[] {
  switch (role) {
    case "TRAINER":
      return trainer;
    case "DOCTOR":
      return doctor;
    case "ADMIN":
      return admin;
    default:
      return member;
  }
}

export function navLabel(role: RoleName): string {
  switch (role) {
    case "TRAINER":
      return "Trainer";
    case "DOCTOR":
      return "Doctor";
    case "ADMIN":
      return "Admin";
    default:
      return "Member";
  }
}
