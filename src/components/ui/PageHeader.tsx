import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { riseVariants } from "../../lib/motion";

interface PageHeaderProps {
  /** Small uppercase tracked label above the title, e.g. "Member · Today" (Dala hint). */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Greeting headings ("Good afternoon, Praveen") use weight 500 and tighter tracking. */
  greeting?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, greeting, actions, className }: PageHeaderProps) {
  return (
    <motion.header
      variants={riseVariants}
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <p className="m-0 text-label font-bold tracking-eyebrow text-orange-ink uppercase">{eyebrow}</p>
        )}
        <h1
          className={cn(
            "m-0 text-ink",
            greeting
              ? "text-[26px] leading-[1.15] font-medium tracking-[-0.03em] sm:text-[34px]"
              : "text-[23px] font-extrabold tracking-[-0.015em] sm:text-h1",
          )}
        >
          {title}
        </h1>
        {description && <p className="m-0 max-w-2xl text-body text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </motion.header>
  );
}
