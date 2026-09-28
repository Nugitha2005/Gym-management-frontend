// Date and label helpers.
// Spring sends LocalDateTime / LocalDate without a timezone ("2026-09-27T17:30:00"),
// meaning "campus local time". We parse them as local time and send them back the same way.

type DateInput = string | number[] | null | undefined;

/** Parse a LocalDateTime / LocalDate from the API as local time. */
export function parseLocal(value: DateInput): Date | null {
  if (value == null) return null;
  // Jackson can also write dates as arrays: [2026, 9, 27, 17, 30, 0]
  if (Array.isArray(value)) {
    const [y, mo = 1, d = 1, h = 0, mi = 0, s = 0] = value;
    return new Date(y, mo - 1, d, h, mi, s);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Date -> "2026-09-27" (Spring LocalDate) */
export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date -> "2026-09-27T17:30:00" (Spring LocalDateTime) */
export function toLocalDateTime(d: Date): string {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** "17:30" */
export function fmtTime(value: DateInput | Date): string {
  const d = value instanceof Date ? value : parseLocal(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "—";
}

/** "27 Sep 2026" */
export function fmtDate(value: DateInput | Date): string {
  const d = value instanceof Date ? value : parseLocal(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
}

/** "Sun 27 Sep" */
export function fmtDayMonth(value: DateInput | Date): string {
  const d = value instanceof Date ? value : parseLocal(value);
  return d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : "—";
}

/** "Sunday, 27 September 2026" */
export function fmtLongDate(d: Date = new Date()): string {
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "SUN" and "27" for the date tiles */
export function dateTile(value: DateInput | Date): { dow: string; day: string } {
  const d = value instanceof Date ? value : parseLocal(value);
  if (!d) return { dow: "—", day: "—" };
  return {
    dow: DAYS[d.getDay()].toUpperCase(),
    day: String(d.getDate()),
  };
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Tomorrow" or "Sun 27 Sep" */
export function relativeDay(value: DateInput | Date, now: Date = new Date()): string {
  const d = value instanceof Date ? value : parseLocal(value);
  if (!d) return "—";
  if (isSameDay(d, now)) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(d, tomorrow)) return "Tomorrow";
  return fmtDayMonth(d);
}

/** "17:30 – 19:00" */
export function timeRange(start: DateInput, end: DateInput): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

/** "Today · 17:30 – 19:00" */
export function whenLabel(start: DateInput, end?: DateInput): string {
  return end ? `${relativeDay(start)} · ${timeRange(start, end)}` : `${relativeDay(start)} · ${fmtTime(start)}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  // "Dr. Anjali Wickramasinghe" -> "Dr. Wickramasinghe"
  if (/^dr\.?$/i.test(parts[0]) && parts.length > 1) return `Dr. ${parts[parts.length - 1]}`;
  return parts[0];
}

/** 80 -> "1 h 20 min" */
export function durationLabel(minutes: number): string {
  if (minutes < 1) return "Less than a minute";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60000));
}

/** Whole days from today until the given date (0 = today). */
export function daysUntil(value: DateInput, now: Date = new Date()): number {
  const d = parseLocal(value);
  if (!d) return 0;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - start.getTime()) / 86400000);
}

/** "12:04" countdown from milliseconds */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad(m)}:${pad(s)}`;
}

/** "OFF_PEAK" -> "Off-peak", "EQUIPMENT_DAMAGE" -> "Equipment damage" */
export function enumLabel(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "OFF_PEAK") return "Off-peak";
  if (value === "WALK_IN") return "Walk-in";
  if (value === "NO_SHOW") return "No-show";
  const words = value.toLowerCase().split("_");
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "1.2 MB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
