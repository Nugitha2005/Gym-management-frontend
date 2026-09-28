import type { RoleName } from "../api/types";

/** Students and university staff use the member screens. */
export const MEMBER_ROLES: RoleName[] = ["STUDENT", "UNIVERSITY_STAFF"];
export const ALL_ROLES: RoleName[] = ["STUDENT", "UNIVERSITY_STAFF", "TRAINER", "DOCTOR", "ADMIN"];

export function isMember(role: RoleName | undefined): boolean {
  return !!role && MEMBER_ROLES.includes(role);
}

/** Where each role lands after logging in. */
export function homePath(role: RoleName): string {
  switch (role) {
    case "TRAINER":
      return "/trainer";
    case "DOCTOR":
      return "/doctor";
    case "ADMIN":
      return "/admin";
    default:
      return "/member";
  }
}

export function roleLabel(role: RoleName | string): string {
  switch (role) {
    case "STUDENT":
      return "Student";
    case "UNIVERSITY_STAFF":
      return "University staff";
    case "TRAINER":
      return "Trainer";
    case "DOCTOR":
      return "Doctor";
    case "ADMIN":
      return "Admin";
    default:
      return String(role);
  }
}
