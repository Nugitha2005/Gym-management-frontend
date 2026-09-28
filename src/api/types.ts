// Shapes of the JSON the Spring Boot API returns. Field names match the *ResponseDto classes.
// Dates arrive as local ISO strings ("2026-09-27T17:30:00"); parse them with lib/format.parseLocal.

export type RoleName = "STUDENT" | "UNIVERSITY_STAFF" | "TRAINER" | "DOCTOR" | "ADMIN";

// user/dto/UserResponseDto
export interface User {
  userId: number;
  name: string;
  universityId: string;
  email: string;
  contactNo: string | null;
  roleName: RoleName;
  active: boolean;
}

// user/dto/RegisterRequestDto
export interface RegisterRequest {
  name: string;
  universityId: string;
  email: string;
  contactNo: string;
  password: string;
}

// access/dto/CheckInRecordResponseDto
export type EntryType = "BOOKED" | "WALK_IN" | "MANUAL";
export interface CheckInRecord {
  recordId: number;
  userId: number;
  userName: string;
  universityId: string;
  entryTime: string;
  exitTime: string | null;
  entryType: EntryType;
  bookingId: number | null;
  sessionTitle: string | null;
  autoClosed: boolean;
  durationMinutes: number;
  insideNow: boolean;
  overstayed: boolean;
  checkedInByName: string | null;
}

// access/dto/CheckInResultDto — outcome is "ENTERED" or "EXITED"
export interface CheckInResult {
  outcome: "ENTERED" | "EXITED" | string;
  message: string;
  record: CheckInRecord | null;
}

// access/dto/InsideNowResponseDto
export interface InsideNow {
  peopleInside: number;
  capacityNow: number | null;
  reservedNotArrived: number;
  records: CheckInRecord[];
}

// access/dto/GymQrCodeResponseDto
export interface GymQrCode {
  code: string;
  createdAt: string;
}

// access/dto/MedicalClearanceResponseDto
export type ClearanceStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
export interface Clearance {
  clearanceId: number;
  userId: number;
  studentName: string;
  universityId: string;
  status: ClearanceStatus;
  submittedDate: string;
  reviewedDate: string | null;
  expiryDate: string | null;
  rejectionReason: string | null;
  reviewedByName: string | null;
  valid: boolean;
  notes: string | null;
}

// booking/dto/*
export type SlotType = "PEAK" | "OFF_PEAK" | "STANDARD";
export interface TrainingSession {
  sessionId: number;
  title: string;
  instructor: string;
  slotType: SlotType;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
  heldCount: number;
  availablePlaces: number;
  cancelled: boolean;
}
export interface TrainingSessionRequest {
  title: string;
  instructor: string;
  slotType: SlotType;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "ATTENDED" | "NO_SHOW";
export interface Booking {
  bookingId: number;
  sessionId: number;
  userId: number;
  status: BookingStatus;
  bookingTime: string;
  sessionTitle: string;
  startTime: string;
  endTime: string;
}

export type WaitlistStatus = "WAITING" | "OFFERED" | "EXPIRED" | "CONVERTED" | "CANCELLED";
export interface WaitlistEntry {
  waitlistId: number;
  sessionId: number;
  userId: number;
  status: WaitlistStatus;
  requestedAt: string;
  offerExpiresAt: string | null;
  sessionTitle: string;
  sessionStartTime: string;
}

// outcome: BOOKED, WAITLISTED, CANCELLED, CONVERTED, EXPIRED, NOT_ELIGIBLE, OFFERED, NO_ACTION
export interface BookingResult {
  outcome: string;
  message: string;
  booking: Booking | null;
  waitlistEntry: WaitlistEntry | null;
}

// equipment/dto/*
export type EquipmentType = "BALL" | "RACKET" | "BOARD_GAME";
export interface Equipment {
  equipmentId: number;
  name: string;
  itemCondition: string;
  available: boolean;
  type: EquipmentType;
  sportType: string | null;
  stringStatus: string | null;
  pieceCount: number | null;
}
export interface EquipmentRequest {
  type: EquipmentType;
  name: string;
  itemCondition: string;
  sportType?: string | null;
  stringStatus?: string | null;
  pieceCount?: number | null;
}

export type LoanStatus = "BORROWED" | "RETURNED" | "LATE";
export interface Loan {
  loanId: number;
  equipmentId: number;
  equipmentName: string;
  userId: number;
  universityId: string;
  userName: string;
  receivedTime: string;
  dueTime: string;
  returnedTime: string | null;
  status: LoanStatus;
  overdue: boolean;
}

// fitness/dto/*
export type GoalType = "WEIGHT_LOSS" | "MUSCLE_GAIN" | "GENERAL_FITNESS";
export interface FitnessProfile {
  profileId: number;
  userId: number;
  userName: string;
  heightCm: number;
  weightKg: number;
  goalType: GoalType;
  targetWeightKg: number | null;
  medicalNotes: string | null;
  bmi: number | null;
  bmiCategory: string | null;
  lastUpdated: string | null;
}
export interface FitnessProfileRequest {
  heightCm: number;
  weightKg: number;
  goalType: GoalType;
  targetWeightKg: number | null;
  medicalNotes: string | null;
}

// incident/dto/*
export type IncidentType = "INJURY" | "EQUIPMENT_DAMAGE" | "FACILITY_ISSUE";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";
export type IncidentStatus = "REPORTED" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
export interface IncidentAction {
  actionId: number;
  actionTaken: string;
  outcome: string | null;
  actionDate: string;
  handledByUserId: number;
  handledByName: string;
  handledByRole: RoleName;
}
export interface Incident {
  incidentId: number;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string | null;
  reportedAt: string;
  status: IncidentStatus;
  assignedRole: RoleName;
  responseDueAt: string | null;
  responseOverdue: boolean;
  reportedByUserId: number;
  reportedByName: string;
  actions: IncidentAction[];
}
export interface IncidentRequest {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string;
}
