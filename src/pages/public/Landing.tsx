import { useRef } from "react";
import { Link } from "react-router";
import { Logo } from "../../components/brand/Logo";
import { ParticleAthlete } from "../../components/brand/ParticleAthlete";
import { ParticleField } from "../../components/brand/ParticleField";
import type { Exercise } from "../../components/brand/particles/poses";
import { WorkoutTrack } from "../../components/brand/WorkoutTrack";
import { LinkButton } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/cn";
import { CountUp, Rise, Stagger } from "../../lib/motion";
import { EquipmentVisual, MedicalVisual, QrCheckInVisual, SessionsVisual, StaffVisual } from "./landing/FeatureVisuals";

/*
 * Public landing page — Dala's layout, type rhythm and motion, recoloured with the app's theme tokens:
 * deep navy canvas instead of black, orange instead of violet, Plus Jakarta Sans instead of PPNeueMontreal.
 * Oversized weight-400 headlines with tight tracking, 18px light body copy, uppercase tracked labels,
 * one orange pill per view, zigzag two-column sections.
 * Motion: the hero's triangles form a dumbbell that turns into an athlete doing squats, and on desktop
 * a small athlete runs along the bottom of the page as you scroll, doing each section's exercise
 * (sections opt in with data-workout).
 */

const wrap = "mx-auto w-full max-w-page px-5 sm:px-8";
const eyebrow = "m-0 text-[13px] font-semibold tracking-eyebrow text-orange uppercase";
const lead = "m-0 text-lead font-light text-on-navy";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-navy text-white">
      <WorkoutTrack />
      <a
        href="#features"
        className="sr-only z-50 rounded-control bg-orange px-4 py-2 font-bold text-navy focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopNav />
      <Hero />
      <Features />
      <Numbers />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  );
}

function TopNav() {
  const link = "text-[14px] font-semibold tracking-nav text-on-navy uppercase no-underline hover:text-white";
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav aria-label="Main" className={cn(wrap, "flex h-20 items-center justify-between gap-6 lg:h-24")}>
        <Link to="/" aria-label="Campus Gym home" className="no-underline">
          <Logo size="md" />
        </Link>
        <div className="hidden items-center gap-9 md:flex">
          <a href="#features" className={link}>
            Features
          </a>
          <a href="#how-it-works" className={link}>
            How it works
          </a>
          <a href="#staff" className={link}>
            For staff
          </a>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          <Link to="/login" className={link}>
            Log in
          </Link>
          <LinkButton to="/register" pill size="sm" className="h-11 px-5 tracking-nav uppercase">
            Join
          </LinkButton>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  const visualRef = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <ParticleAthlete
        kind="squat"
        intro="dumbbell"
        anchorRef={visualRef}
        spacing={desktop ? 5 : 6.5}
        ambient={desktop ? 1 : 0.8}
      />
      <div
        className={cn(
          wrap,
          "relative grid items-center gap-6 pt-32 pb-16 sm:pt-36 lg:min-h-[max(760px,100svh)] lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-28 lg:pb-20",
        )}
      >
        <Stagger className="flex flex-col">
          <Rise as="h1" id="hero-title" className="m-0 text-hero font-normal text-balance text-white">
            Your campus gym, without the paperwork.
          </Rise>
          <Rise as="p" className={cn(eyebrow, "mt-10 lg:mt-12")}>
            SLIIT campus gym
          </Rise>
          <Rise as="p" className={cn(lead, "mt-4 max-w-[480px]")}>
            Check in with a QR code, book a training session, borrow a racket and get medically cleared — from your
            phone, in one place.
          </Rise>
          <Rise className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <LinkButton to="/register" pill size="lg" iconRight="arrowRight" className="px-7">
              Create an account
            </LinkButton>
            <Link to="/login" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white no-underline hover:text-white">
              <span className="underline decoration-white/30 underline-offset-[6px] group-hover:decoration-orange">Log in</span>
            </Link>
          </Rise>
        </Stagger>
        {/* The dumbbell, then the squatting athlete, forms inside this box (the canvas covers the whole hero). */}
        <div ref={visualRef} aria-hidden="true" className="h-[300px] sm:h-[400px] lg:h-[600px]" />
      </div>
    </section>
  );
}

interface Feature {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: React.ReactNode;
  /** What the runner at the bottom of the page does while this section is in view. */
  workout: Exercise;
}

const features: Feature[] = [
  {
    eyebrow: "QR check-in",
    title: "Scan in. Scan out. That’s the whole visit.",
    body: "Scan the gym QR code at the door and the system checks you in — scan again on your way out. No sign-in sheet and no queue at the desk.",
    points: [
      "Works with your phone camera, or type the code under the QR",
      "Booked members are matched to their session automatically",
      "The front desk can check in members who forgot their phone",
    ],
    visual: <QrCheckInVisual />,
    workout: "pushup",
  },
  {
    eyebrow: "Medical clearance",
    title: "Cleared by the university doctor, once.",
    body: "Upload your medical form as a PDF or a photo. The campus doctor reviews it online and sets how long your clearance lasts — the countdown sits on your home screen.",
    points: ["PDF, JPG or PNG up to 5 MB", "The doctor’s reason is shown if a form is rejected", "Check-in unlocks the moment you are approved"],
    visual: <MedicalVisual />,
    workout: "plank",
  },
  {
    eyebrow: "Sessions and waitlist",
    title: "Full session? You’re next in line.",
    body: "Book one of up to ten places in a training session. If it’s full, you join the waitlist — when someone cancels, the place is offered to you with a timer to accept.",
    points: ["Peak, off-peak and standard sessions", "Waitlist offers with a clear deadline", "Cancel in one tap before the session starts"],
    visual: <SessionsVisual />,
    workout: "pulldown",
  },
  {
    eyebrow: "Equipment lending",
    title: "Borrow a racket. Know when it’s due.",
    body: "See which balls, rackets and board games are free right now. Items are lent at the front desk with a due time, and late returns are flagged.",
    points: ["Live availability for every item", "Due times and late flags on your home screen", "Your full loan history in one list"],
    visual: <EquipmentVisual />,
    workout: "curl",
  },
  {
    id: "staff",
    eyebrow: "For staff",
    title: "One desk for trainers, the doctor and admins.",
    body: "Trainers see who’s inside and run the counter. The doctor works through clearances and injuries in order of urgency. Admins manage users and the gym QR code.",
    points: [
      "Live capacity at the door — 20 people inside at once",
      "Incident queues sorted by severity, with response deadlines",
      "Role changes and QR code resets for admins",
    ],
    visual: <StaffVisual />,
    workout: "jacks",
  },
];

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="relative scroll-mt-8 py-24 lg:py-30">
      <div className={wrap}>
        <Stagger inView className="flex max-w-3xl flex-col gap-5">
          <Rise as="p" className={eyebrow}>
            What the system does
          </Rise>
          <Rise as="h2" id="features-title" className="m-0 text-section font-normal text-balance text-white">
            Everything the front desk used to do on paper.
          </Rise>
        </Stagger>
        <div className="mt-20 flex flex-col gap-28 lg:mt-28 lg:gap-36">
          {features.map((feature, i) => (
            <FeatureRow key={feature.eyebrow} feature={feature} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature, reverse }: { feature: Feature; reverse: boolean }) {
  return (
    <Stagger
      as="article"
      inView
      id={feature.id}
      data-workout={feature.workout}
      aria-label={feature.eyebrow}
      className="grid scroll-mt-24 items-center gap-12 lg:grid-cols-2 lg:gap-24"
    >
      <div className={cn("flex flex-col gap-5", reverse && "lg:order-2")}>
        <Rise as="p" className={eyebrow}>
          {feature.eyebrow}
        </Rise>
        <Rise
          as="h3"
          className="m-0 text-[clamp(2rem,3.6vw,3rem)] leading-[1.05] font-normal tracking-[-0.035em] text-balance text-white"
        >
          {feature.title}
        </Rise>
        <Rise as="p" className={cn(lead, "max-w-[520px]")}>
          {feature.body}
        </Rise>
        <Rise as="ul" className="m-0 mt-2 flex list-none flex-col gap-3 p-0">
          {feature.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-[15px] font-normal text-white/90">
              {/* Tiny outlined triangle — the particle motif as a bullet */}
              <svg aria-hidden="true" viewBox="0 0 12 12" className="mt-1.5 h-3 w-3 shrink-0 stroke-orange" fill="none" strokeWidth={1.4}>
                <path d="M6 1.5 10.5 10h-9z" strokeLinejoin="round" />
              </svg>
              {point}
            </li>
          ))}
        </Rise>
      </div>
      <Rise className={cn(reverse && "lg:order-1")}>{feature.visual}</Rise>
    </Stagger>
  );
}

// Real gym rules from the backend (CheckInService, TrainingSessionRequestDto, DoctorIncidentHandler),
// not made-up usage numbers — there is no public endpoint for live counts yet.
const numbers: Array<{ value: number; suffix?: string; label: string; note: string }> = [
  { value: 20, label: "people in the gym at once", note: "Capacity is counted live at the door." },
  { value: 10, label: "places to book in every session", note: "The rest of the floor is kept for walk-ins." },
  { value: 3, label: "ways to check in", note: "Scan the QR, type the code or ask the front desk." },
  { value: 1, suffix: "h", label: "doctor response to a serious injury", note: "Every report gets a deadline by severity." },
];

function Numbers() {
  return (
    <section aria-labelledby="numbers-title" data-workout="squat" className="border-y border-white/8 py-20 lg:py-24">
      <div className={wrap}>
        <Stagger inView className="flex flex-col gap-12">
          <Rise as="h2" id="numbers-title" className={eyebrow}>
            The gym by the rules
          </Rise>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {numbers.map((n) => (
              <Rise key={n.label} className="flex flex-col gap-3 border-t border-white/12 pt-6">
                <p className="m-0 flex items-baseline gap-1 text-[clamp(3.5rem,6vw,5rem)] leading-none font-normal tracking-[-0.04em] text-white">
                  <CountUp value={n.value} startInView />
                  {n.suffix && <span className="text-[0.55em] text-orange">{n.suffix}</span>}
                </p>
                <p className="m-0 text-[16px] font-semibold text-white">{n.label}</p>
                <p className="m-0 text-[15px] font-light text-on-navy">{n.note}</p>
              </Rise>
            ))}
          </div>
        </Stagger>
      </div>
    </section>
  );
}

const steps = [
  { title: "Create an account", body: "Register with your university ID and email. It takes about a minute." },
  { title: "Upload your medical form", body: "A PDF or a photo, up to 5 MB. The university doctor reviews it online." },
  { title: "Book a session", body: "Pick a time that suits you. If it’s full, join the waitlist and wait for an offer." },
  { title: "Scan in at the door", body: "Scan the QR code by the door to check in, and again when you leave." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" data-workout="raise" className="scroll-mt-8 py-24 lg:py-30">
      <div className={wrap}>
        <Stagger inView className="flex flex-col gap-16">
          <div className="flex max-w-3xl flex-col gap-5">
            <Rise as="p" className={eyebrow}>
              How it works
            </Rise>
            <Rise as="h2" id="how-title" className="m-0 text-section font-normal text-balance text-white">
              From sign-up to your first set in four steps.
            </Rise>
          </div>
          <ol className="m-0 grid list-none grid-cols-1 gap-10 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, i) => (
              <Rise as="li" key={step.title} className="flex flex-col gap-4 border-t border-white/12 pt-6">
                <span className="text-[14px] font-semibold tracking-nav text-orange tabular-nums">0{i + 1}</span>
                <h3 className="m-0 text-[24px] leading-tight font-normal tracking-[-0.02em] text-white">{step.title}</h3>
                <p className="m-0 text-[16px] leading-relaxed font-light text-on-navy">{step.body}</p>
              </Rise>
            ))}
          </ol>
        </Stagger>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="cta-title" data-workout="celebrate" className="relative overflow-hidden border-t border-white/8">
      <ParticleField shape="none" ambient={0.9} interactive={false} />
      <div className={cn(wrap, "relative py-28 lg:py-40")}>
        <Stagger inView className="flex max-w-4xl flex-col gap-8">
          <Rise as="h2" id="cta-title" className="m-0 text-[clamp(2.75rem,6vw,5.5rem)] leading-[1] font-normal tracking-[-0.04em] text-balance text-white">
            Your next session starts at the door.
          </Rise>
          <Rise as="p" className={cn(lead, "max-w-[520px]")}>
            Open to every SLIIT student and member of university staff. Bring your university ID — we’ll handle the paperwork.
          </Rise>
          <Rise className="flex flex-wrap items-center gap-x-7 gap-y-4">
            <LinkButton to="/register" pill size="lg" iconRight="arrowRight" className="px-7">
              Create an account
            </LinkButton>
            <Link to="/login" className="text-[15px] font-semibold text-white underline decoration-white/30 underline-offset-[6px] hover:text-white hover:decoration-orange">
              I already have one
            </Link>
          </Rise>
        </Stagger>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/8 py-12">
      <div className={cn(wrap, "flex flex-col gap-10 md:flex-row md:items-start md:justify-between")}>
        <div className="flex flex-col gap-4">
          <Logo size="sm" />
          <p className="m-0 max-w-xs text-[14px] font-light text-on-navy">
            The SLIIT campus gym, without the paperwork.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 text-[14px] sm:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-2">
            <p className="m-0 text-label font-bold tracking-eyebrow text-on-navy-muted uppercase">Opening hours</p>
            <p className="m-0 font-light text-white">Students 08:00 – 17:30</p>
            <p className="m-0 font-light text-white">University staff 08:00 – 22:00</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="m-0 text-label font-bold tracking-eyebrow text-on-navy-muted uppercase">Contact</p>
            <p className="m-0 flex items-center gap-2 font-light text-white">
              <Icon name="mapPin" size={16} className="text-orange" />
              Gym front desk, SLIIT campus
            </p>
            <p className="m-0 font-light text-on-navy">Questions about your account? Ask a trainer at the desk.</p>
          </div>
        </div>
      </div>
      <div className={cn(wrap, "mt-10 flex flex-col gap-2 border-t border-white/8 pt-6 text-[13px] text-on-navy-muted sm:flex-row sm:justify-between")}>
        <span>© {new Date().getFullYear()} SLIIT Campus Gym</span>
        <span>SE2012 · SE2032 group project</span>
      </div>
    </footer>
  );
}
