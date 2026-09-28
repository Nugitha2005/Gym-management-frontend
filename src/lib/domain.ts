// Small pieces of PlayBook business logic shared by several screens.
import type { Clearance, ClearanceStatus, Equipment, GoalType, IncidentType, SlotType } from "../api/types";
import type { BadgeTone } from "../components/ui/Badge";
import type { IconName } from "../components/ui/Icon";
import { daysUntil, parseLocal } from "./format";

export type ClearanceState = ClearanceStatus | "EXPIRED" | "NONE";

/** The member's current clearance: the newest one (the API returns newest first). */
export function currentClearance(list: Clearance[] | undefined): { state: ClearanceState; clearance: Clearance | null } {
  if (!list || list.length === 0) return { state: "NONE", clearance: null };
  const newest = [...list].sort((a, b) => b.clearanceId - a.clearanceId)[0];
  if (newest.status === "APPROVED" && newest.expiryDate && daysUntil(newest.expiryDate) < 0) {
    return { state: "EXPIRED", clearance: newest };
  }
  return { state: newest.status, clearance: newest };
}

export const clearanceTone: Record<ClearanceState, BadgeTone> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  REVOKED: "danger",
  EXPIRED: "danger",
  NONE: "neutral",
};

export const slotTone: Record<SlotType, BadgeTone> = { PEAK: "orange", OFF_PEAK: "info", STANDARD: "neutral" };
export const slotLabel: Record<SlotType, string> = { PEAK: "Peak", OFF_PEAK: "Off-peak", STANDARD: "Standard" };

export const equipmentTypeLabel: Record<Equipment["type"], string> = {
  BALL: "Ball",
  RACKET: "Racket",
  BOARD_GAME: "Board game",
};

export const equipmentIcon: Record<Equipment["type"], IconName> = { BALL: "ball", RACKET: "racket", BOARD_GAME: "puzzle" };

/** "Basketball" / "Badminton · strings good" / "32 pieces" */
export function equipmentDetails(e: Equipment): string {
  if (e.type === "BOARD_GAME") return e.pieceCount ? `${e.pieceCount} pieces` : "Board game";
  if (e.type === "RACKET") {
    return [e.sportType, e.stringStatus ? `strings ${e.stringStatus.toLowerCase()}` : null].filter(Boolean).join(" · ");
  }
  return e.sportType ?? "";
}

export const goalLabel: Record<GoalType, string> = {
  WEIGHT_LOSS: "Weight loss",
  MUSCLE_GAIN: "Muscle gain",
  GENERAL_FITNESS: "General fitness",
};

export const incidentTypeLabel: Record<IncidentType, string> = {
  INJURY: "Injury",
  EQUIPMENT_DAMAGE: "Equipment damage",
  FACILITY_ISSUE: "Facility issue",
};

/** Has the session already started? */
export function hasStarted(startTime: string, now: Date = new Date()): boolean {
  const start = parseLocal(startTime);
  return !!start && start.getTime() <= now.getTime();
}
