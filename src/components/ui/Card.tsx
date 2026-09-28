import { Link } from "react-router";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { riseVariants } from "../../lib/motion";
import { Icon, type IconName } from "./Icon";

// Card: white, 16px radius, line-coloured border, soft shadow (see theme.css). Every card fades up inside a <Stagger>.

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article";
  padding?: "none" | "sm" | "md";
  /** "navy" is the dark Member ID card; everything else is a white card. */
  surface?: "white" | "navy";
  /** Accessible name when the card has no visible heading. */
  label?: string;
}

export function Card({ as = "section", padding = "md", surface = "white", label, className, children, ...rest }: CardProps) {
  const Component = motion[as] as React.ElementType;
  return (
    <Component
      aria-label={label}
      variants={riseVariants}
      className={cn(
        "min-w-0 rounded-card",
        surface === "white" ? "border border-line bg-white shadow-card" : "bg-navy text-white shadow-id",
        padding === "md" && "p-5 sm:p-6",
        padding === "sm" && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

/** Icon tile + card title (+ optional right side), as used on every app card. */
export function CardHeader({
  icon,
  title,
  titleId,
  aside,
  className,
}: {
  icon?: IconName;
  title: React.ReactNode;
  titleId?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {icon && <IconTile icon={icon} />}
      <h2 id={titleId} className="m-0 min-w-0 flex-1 text-card-title font-bold text-ink">
        {title}
      </h2>
      {aside}
    </div>
  );
}

export function IconTile({ icon, tone = "ocean", size = 40 }: { icon: IconName; tone?: "ocean" | "orange" | "success" | "danger"; size?: number }) {
  const toneClass = {
    ocean: "bg-tile text-ocean",
    orange: "bg-orange text-navy",
    success: "bg-success text-white",
    danger: "bg-danger-bg text-danger-ink",
  }[tone];
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-control", toneClass)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size / 2)} strokeWidth={tone === "orange" || tone === "success" ? 2 : 1.8} />
    </div>
  );
}

/** Dashboard tile: a whole card that links somewhere, with hover lift. */
export function TileLink({ to, label, className, children }: { to: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={riseVariants} className="min-w-0">
      <Link
        to={to}
        aria-label={label}
        className={cn(
          "press flex h-full flex-col gap-3.5 rounded-card border border-line bg-white p-5 text-ink no-underline shadow-card sm:p-[22px]",
          "hover:border-line-hover hover:text-ink hover:shadow-hover active:scale-[0.98]",
          className,
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
