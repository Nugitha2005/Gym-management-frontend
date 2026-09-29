import { cn } from "../../lib/cn";

const sizes = {
  sm: { crest: 34, text: "text-[19px]" }, // app top bar
  md: { crest: 38, text: "text-[20px]" }, // landing nav, phones
  lg: { crest: 48, text: "text-[24px]" }, // login/register brand panel
};

/** SLIIT crest + "Campus Gym" wordmark. */
export function Logo({ size = "md", tone = "light", className }: { size?: keyof typeof sizes; tone?: "light" | "dark"; className?: string }) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/sliit-logo.png" alt="" aria-hidden="true" className="shrink-0 select-none" style={{ height: s.crest, width: "auto" }} draggable={false} />
      <span className={cn(s.text, "font-extrabold tracking-[-0.01em] whitespace-nowrap", tone === "light" ? "text-white" : "text-navy")}>
        Campus Gym
      </span>
    </span>
  );
}
