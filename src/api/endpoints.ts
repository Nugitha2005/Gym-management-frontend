// One group per Spring Boot controller. Paths match the @RequestMapping values exactly.
import { api, requestBlob } from "./client";
import type {
  Booking,
  BookingResult,
  CheckInRecord,
  CheckInResult,
  Clearance,
  Equipment,
  EquipmentRequest,
  FitnessProfile,
  FitnessProfileRequest,
  GymQrCode,
  Incident,
  IncidentRequest,
  IncidentStatus,
  InsideNow,
  Loan,
  RegisterRequest,
  RoleName,
  TrainingSession,
  TrainingSessionRequest,
  User,
  WaitlistEntry,
} from "./types";

// user/controller/AuthController — /api/auth
export const authApi = {
  me: (signal?: AbortSignal) => api.get<User>("/auth/me", signal),
  login: (email: string, password: string) => api.post<User>("/auth/login", { email, password }),
  register: (data: RegisterRequest) => api.post<User>("/auth/register", { ...data }),
  logout: () => api.post<{ message: string }>("/auth/logout"),
};

// user/controller/UserController — /api/users
export const usersApi = {
  all: () => api.get<User[]>("/users"),
  lookup: (universityId: string) =>
    api.get<User>(`/users/lookup?universityId=${encodeURIComponent(universityId.trim())}`),
  changeRole: (userId: number, roleName: RoleName) => api.put<User>(`/users/${userId}/role`, { roleName }),
};

// access/controller/CheckInController — /api/checkin
export const checkInApi = {
  scan: (code: string) => api.post<CheckInResult>("/checkin/scan", { code: code.trim() }),
  status: () => api.get<CheckInRecord>("/checkin/status"), // 404 when not inside
  myHistory: () => api.get<CheckInRecord[]>("/checkin/my"),
  manual: (userId: number) => api.post<CheckInResult>(`/checkin/manual/${userId}`),
  inside: () => api.get<InsideNow>("/checkin/inside"),
  forceCheckout: (recordId: number) => api.put<CheckInRecord>(`/checkin/records/${recordId}/force-checkout`),
  qr: () => api.get<GymQrCode>("/checkin/qr"),
  resetQr: () => api.put<GymQrCode>("/checkin/qr/reset"),
};

// access/controller/MedicalClearanceController — /api/clearances
export const clearanceApi = {
  submit: (file: File, notes: string) => {
    const form = new FormData();
    form.append("file", file);
    if (notes.trim()) form.append("notes", notes.trim());
    return api.post<Clearance>("/clearances", form);
  },
  mine: () => api.get<Clearance[]>("/clearances/my"),
  pending: () => api.get<Clearance[]>("/clearances/pending"),
  document: (id: number) => requestBlob(`/clearances/${id}/document`),
  approve: (id: number, expiryDate: string) => api.put<Clearance>(`/clearances/${id}/approve`, { expiryDate }),
  reject: (id: number, reason: string) => api.put<Clearance>(`/clearances/${id}/reject`, { reason }),
};

// booking/controller/BookingController — /api/bookings
export const bookingApi = {
  upcoming: () => api.get<TrainingSession[]>("/bookings/sessions/upcoming"),
  mine: () => api.get<Booking[]>("/bookings/my"),
  myWaitlist: () => api.get<WaitlistEntry[]>("/bookings/waitlist/my"),
  // A full session puts the member on the waitlist (outcome WAITLISTED)
  book: (sessionId: number) => api.post<BookingResult>(`/bookings/book?sessionId=${sessionId}`),
  cancel: (bookingId: number) => api.delete<BookingResult>(`/bookings/${bookingId}/cancel`),
  acceptOffer: (waitlistId: number) => api.put<BookingResult>(`/bookings/waitlist/${waitlistId}/accept`),
  declineOffer: (waitlistId: number) => api.put<BookingResult>(`/bookings/waitlist/${waitlistId}/decline`),
  createSession: (data: TrainingSessionRequest) => api.post<TrainingSession>("/bookings/sessions", { ...data }),
  cancelSession: (sessionId: number) => api.delete<void>(`/bookings/sessions/${sessionId}/cancel`),
};

// equipment/controller/EquipmentController — /api/equipment
export const equipmentApi = {
  all: () => api.get<Equipment[]>("/equipment"),
  available: () => api.get<Equipment[]>("/equipment/available"),
  create: (data: EquipmentRequest) => api.post<Equipment>("/equipment", { ...data }),
  update: (id: number, data: EquipmentRequest) => api.put<Equipment>(`/equipment/${id}`, { ...data }),
  remove: (id: number) => api.delete<void>(`/equipment/${id}`),
};

// equipment/controller/EquipmentLoanController — /api/equipment-loans
export const loanApi = {
  all: () => api.get<Loan[]>("/equipment-loans"),
  mine: () => api.get<Loan[]>("/equipment-loans/my"),
  active: () => api.get<Loan[]>("/equipment-loans/active"),
  overdue: () => api.get<Loan[]>("/equipment-loans/overdue"),
  lend: (equipmentId: number, userId: number, dueTime: string) =>
    api.post<Loan>("/equipment-loans", { equipmentId, userId, dueTime }),
  markReturned: (loanId: number) => api.put<Loan>(`/equipment-loans/${loanId}/return`),
};

// fitness/controller/FitnessProfileController — /api/fitness-profiles
export const fitnessApi = {
  mine: () => api.get<FitnessProfile>("/fitness-profiles/me"), // 404 when not filled in yet
  save: (data: FitnessProfileRequest) => api.put<FitnessProfile>("/fitness-profiles/me", { ...data }),
  forUser: (userId: number) => api.get<FitnessProfile>(`/fitness-profiles/user/${userId}`),
};

// incident/controller/IncidentController — /api/incidents
export const incidentApi = {
  report: (data: IncidentRequest) => api.post<Incident>("/incidents", { ...data }),
  mine: () => api.get<Incident[]>("/incidents/my"),
  queue: () => api.get<Incident[]>("/incidents/queue"),
  addAction: (id: number, actionTaken: string, outcome: string) =>
    api.post<Incident>(`/incidents/${id}/actions`, { actionTaken, outcome: outcome || null }),
  setStatus: (id: number, status: IncidentStatus) => api.put<Incident>(`/incidents/${id}/status`, { status }),
};
