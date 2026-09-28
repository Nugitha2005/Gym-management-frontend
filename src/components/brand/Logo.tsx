import { cn } from "../../lib/cn";
import { Icon } from "../ui/Icon";

const sizes = {
  sm: { tile: 34, radius: 10, icon: 20, text: "text-[19px]" }, // app top bar
  md: { tile: 36, radius: 10, icon: 20, text: "text-[20px]" }, // landing nav, phones
  lg: { tile: 44, radius: 12, icon: 24, text: "text-[24px]" }, // login/register brand panel
};

/** Orange tile with the dumbbell mark + "PlayBook" wordmark. */
export function Logo({ size = "md", tone = "light", className }: { size?: keyof typeof sizes; tone?: "light" | "dark"; className?: string }) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="flex shrink-0 items-center justify-center bg-orange text-navy"
        style={{ width: s.tile, height: s.tile, borderRadius: s.radius }}
        aria-hidden="true"
      >
        <Icon name="dumbbell" size={s.icon} strokeWidth={2.2} />
      </span>
      <span className={cn(s.text, "font-extrabold tracking-[-0.01em]", tone === "light" ? "text-white" : "text-navy")}>
        PlayBook
      </span>
    </span>
  );
}
