import { CountUp } from "../../lib/motion";
import { cn } from "../../lib/cn";
import { Badge, type BadgeTone } from "../ui/Badge";

const BANDS: Array<{ label: string; range: string; from: number; to: number; tone: BadgeTone; bar: string }> = [
  { label: "Underweight", range: "below 18.5", from: 12, to: 18.5, tone: "info", bar: "bg-ocean-soft" },
  { label: "Normal", range: "18.5 – 24.9", from: 18.5, to: 25, tone: "success", bar: "bg-success" },
  { label: "Overweight", range: "25 – 29.9", from: 25, to: 30, tone: "warning", bar: "bg-warning" },
  { label: "Obese", range: "30 and above", from: 30, to: 40, tone: "danger", bar: "bg-danger" },
];
const MIN = 12;
const MAX = 40;

/** BMI value, category and a scale with a marker (12_Fitness_profile). */
export function BmiPanel({ bmi, category }: { bmi: number | null | undefined; category: string | null | undefined }) {
  if (bmi == null) {
    return <p className="m-0 text-[14px] text-muted">Enter your height and weight to see your BMI.</p>;
  }
  const band = BANDS.find((b) => b.label.toLowerCase() === (category ?? "").toLowerCase()) ?? BANDS.find((b) => bmi < b.to) ?? BANDS[3];
  const pct = Math.min(100, Math.max(0, ((bmi - MIN) / (MAX - MIN)) * 100));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <CountUp value={bmi} decimals={1} className="text-[44px] leading-none font-extrabold tracking-[-0.02em] text-ink" />
        <Badge tone={band.tone}>{band.label}</Badge>
      </div>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
            {BANDS.map((b) => (
              <span key={b.label} className={cn("h-full", b.bar, b.label !== band.label && "opacity-35")} style={{ width: `${((b.to - b.from) / (MAX - MIN)) * 100}%` }} />
            ))}
          </div>
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-navy shadow-hover"
            style={{ left: `${pct}%` }}
          />
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-2 p-0 pt-2 sm:grid-cols-4">
          {BANDS.map((b) => (
            <li key={b.label} className="flex flex-col">
              <span className={cn("text-[13px]", b.label === band.label ? "font-bold text-ink" : "font-semibold text-muted")}>{b.label}</span>
              <span className="text-[12px] text-muted tabular-nums">{b.range}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="m-0 text-[13px] text-muted">BMI = weight (kg) ÷ height (m)²</p>
    </div>
  );
}
