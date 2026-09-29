import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { Logo } from "../components/brand/Logo";
import { ParticleAthlete } from "../components/brand/ParticleAthlete";
import { ParticleField } from "../components/brand/ParticleField";
import { MotionControl } from "../components/brand/particles/control";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { cn } from "../lib/cn";
import { EASE_SOFT } from "../lib/motion";
import { AuthSceneContext } from "./authScene";

/**
 * Login / register layout (01_Login, 02_Register, 03_Login_mobile).
 * Left: navy gradient brand panel with the Dala hint — a triangle-particle athlete (bench press on login,
 * lateral raises on register) and a weight-400, tight-tracked headline. Right: the white form card.
 * The athlete reacts to the form: typing speeds up the reps, and the form can signal effort or a mistake
 * through useAuthScene(). On phones the panel sits on top and the form slides up over it as a white sheet.
 */
export function AuthLayout({
  children,
  wide = false,
  athlete = "bench",
}: {
  children: React.ReactNode;
  wide?: boolean;
  athlete?: "bench" | "raise";
}) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduce = useReducedMotion();
  const [control] = useState(() => new MotionControl());
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, ease: EASE_SOFT, delay },
        };

  return (
    <div className="min-h-dvh bg-white lg:flex lg:bg-off-white">
      <section
        aria-label="PlayBook"
        className={cn(
          "relative flex min-h-[312px] flex-col justify-between overflow-hidden px-5 pt-7 pb-14 text-white",
          "bg-linear-160 from-navy via-navy-mid via-58% to-ocean",
          "lg:sticky lg:top-0 lg:h-dvh lg:w-[44%] lg:max-w-[640px] lg:shrink-0 lg:p-16",
        )}
      >
        {/* Court lines from the mockup, 8% white */}
        <svg
          aria-hidden="true"
          viewBox="0 0 760 760"
          fill="none"
          className="absolute -right-[170px] -bottom-[190px] h-[420px] w-[420px] stroke-white/8 lg:-right-[250px] lg:-bottom-[250px] lg:h-[760px] lg:w-[760px]"
          strokeWidth={2}
        >
          <rect x="1" y="1" width="758" height="758" />
          <path d="M1 380H759" />
          <circle cx="380" cy="380" r="180" />
          <circle cx="380" cy="380" r="56" />
          <path d="M270 1V150H490V1" />
          <circle cx="380" cy="150" r="70" />
        </svg>

        {desktop ? (
          <ParticleAthlete
            kind={athlete}
            control={control}
            box={{ x: 0.56, y: 0.37, w: 0.84, h: 0.46 }}
            spacing={4.2}
            ambient={0.45}
            opacity={0.85}
          />
        ) : (
          <ParticleField shape="none" ambient={0.7} />
        )}

        <motion.div {...rise(0)} className="relative">
          <Link to="/" aria-label="PlayBook home" className="inline-flex no-underline">
            <Logo size={desktop ? "lg" : "md"} />
          </Link>
        </motion.div>

        <motion.div {...rise(0.09)} className="relative flex flex-col gap-4 lg:pb-16">
          <p className="m-0 text-label font-bold tracking-eyebrow text-orange uppercase">SLIIT campus gym</p>
          <p className="m-0 max-w-[480px] text-[34px] leading-[1.05] font-normal tracking-[-0.035em] text-balance lg:text-[56px] lg:leading-[1.02] lg:tracking-[-0.04em]">
            Your campus gym, without the paperwork.
          </p>
        </motion.div>
      </section>

      <main
        onInput={() => control.bump(0.2)}
        className={cn(
          "relative -mt-6 rounded-t-[24px] bg-white px-5 pt-8 pb-10",
          "lg:mt-0 lg:flex lg:min-h-dvh lg:flex-1 lg:items-center lg:justify-center lg:rounded-none lg:bg-transparent lg:px-12 lg:py-10",
        )}
      >
        <motion.div
          {...rise(0.14)}
          className={cn(
            "mx-auto w-full",
            wide ? "max-w-[520px]" : "max-w-[440px]",
            "lg:rounded-card lg:border lg:border-line lg:bg-white lg:shadow-raised",
            wide ? "lg:px-10 lg:pt-10 lg:pb-8" : "lg:px-10 lg:pt-11 lg:pb-9",
          )}
        >
          <AuthSceneContext.Provider value={control}>{children}</AuthSceneContext.Provider>
        </motion.div>
      </main>
    </div>
  );
}
