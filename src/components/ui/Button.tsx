import { forwardRef } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Spinner";

// Design system buttons:
//   primary   — orange, navy text. One per screen. `pulse` adds the Check in ring.
//   secondary — ocean blue, white text
//   outline   — ocean blue border
//   ghost     — neutral border
//   danger    — red outline (row actions), danger-solid for the confirm step in a dialog
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-solid" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-orange text-navy font-bold shadow-button hover:brightness-105",
  secondary: "bg-ocean text-white font-bold hover:brightness-110",
  outline: "border-[1.5px] border-ocean bg-white text-ocean font-bold hover:bg-ghost-hover",
  ghost: "border border-line-strong bg-white text-ink font-semibold hover:bg-ghost-hover",
  danger: "border border-danger-edge bg-white text-danger-ink font-bold hover:bg-danger-hover",
  "danger-solid": "bg-danger-strong text-white font-extrabold hover:brightness-105",
  link: "text-ocean font-bold underline-offset-4 hover:underline hover:text-navy",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-[14px] rounded-[10px] gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-control gap-2",
  lg: "h-[52px] px-6 text-base rounded-control gap-2",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  /** Orange ring that grows and fades (Check in). */
  pulse?: boolean;
  /** Landing-page pill shape (Dala CTA). */
  pill?: boolean;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

function classes({ variant = "primary", size = "md", pulse, pill, block, className }: CommonProps) {
  return cn(
    "press inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none",
    "disabled:cursor-not-allowed disabled:opacity-55",
    variant !== "link" && sizeClass[size],
    variantClass[variant],
    pulse && "animate-pulse-ring",
    pill && "rounded-full",
    block && "w-full",
    className,
  );
}

function Content({ icon, iconRight, loading, size, children }: CommonProps) {
  const iconSize = size === "sm" ? 16 : 18;
  return (
    <>
      {loading ? <Spinner size={iconSize} /> : icon && <Icon name={icon} size={iconSize} strokeWidth={2} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} strokeWidth={2} />}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconRight, loading, pulse, pill, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes({ variant, size, pulse, pill, block, className })}
      {...rest}
    >
      <Content icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  );
});

type LinkButtonProps = CommonProps & { to: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** Same look as <Button>, but navigates (react-router Link, or a plain anchor for #hash links). */
export function LinkButton({ to, variant, size, icon, iconRight, pulse, pill, block, className, children, ...rest }: LinkButtonProps) {
  const cls = cn(classes({ variant, size, pulse, pill, block, className }), "no-underline");
  const content = (
    <Content icon={icon} iconRight={iconRight} size={size}>
      {children}
    </Content>
  );
  if (to.startsWith("#")) {
    return (
      <a href={to} className={cls} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...rest}>
      {content}
    </Link>
  );
}

/** Square icon-only button (close, edit, delete). Always pass an aria-label. */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = 40,
  className,
  ...rest
}: { icon: IconName; label: string; variant?: "ghost" | "danger" | "plain" | "on-navy"; size?: number } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = {
    ghost: "border border-line-strong bg-white text-ink hover:bg-ghost-hover",
    danger: "border border-danger-edge bg-white text-danger-ink hover:bg-danger-hover",
    plain: "text-muted hover:bg-ghost-hover hover:text-ink",
    "on-navy": "text-white hover:bg-white/10",
  }[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("press inline-flex shrink-0 items-center justify-center rounded-[10px]", look, className)}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} strokeWidth={2} />
    </button>
  );
}
