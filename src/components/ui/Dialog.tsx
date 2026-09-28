import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { Button, IconButton } from "./Button";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Esc closes, Tab stays inside, focus returns to the opener, page behind doesn't scroll. */
function useModalBehaviour(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = window.setTimeout(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel)?.focus();
    }, 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open, panelRef]);
}

function Scrim({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] cursor-default bg-navy/45"
    />
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions get the red confirm button. */
  danger?: boolean;
  loading?: boolean;
}

/** Centered confirmation (alertdialog), e.g. "Cancel Evening Session?" */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel, cancelLabel = "Cancel", danger, loading }: ConfirmDialogProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const reduce = useReducedMotion();
  useModalBehaviour(open, onClose, panelRef);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <Scrim onClick={onClose} label={cancelLabel} />
          <div className="pointer-events-none fixed inset-0 z-[61] flex items-end justify-center p-4 sm:items-center">
            <motion.section
              ref={panelRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={children ? bodyId : undefined}
              tabIndex={-1}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="pointer-events-auto flex w-full max-w-[480px] flex-col gap-4 rounded-card bg-white p-6 shadow-dialog sm:p-7"
            >
              <h2 id={titleId} className="m-0 text-[20px] leading-tight font-extrabold tracking-[-0.01em] text-ink">
                {title}
              </h2>
              {children && (
                <div id={bodyId} className="text-body text-muted">
                  {children}
                </div>
              )}
              <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="ghost" size="lg" onClick={onClose} data-autofocus>
                  {cancelLabel}
                </Button>
                <Button variant={danger ? "danger-solid" : "secondary"} size="lg" onClick={onConfirm} loading={loading}>
                  {confirmLabel}
                </Button>
              </div>
            </motion.section>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Buttons pinned to the bottom of the sheet. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

/** Side sheet for forms (Create session, Add item). Slides in from the right; bottom sheet on phones. */
export function Sheet({ open, onClose, title, footer, children, width = 480 }: SheetProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  useModalBehaviour(open, onClose, panelRef);
  const isPhone = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  const hidden = reduce ? { opacity: 0 } : isPhone ? { y: "100%" } : { x: "100%" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <Scrim onClick={onClose} label="Close" />
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={hidden}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={hidden}
            transition={{ duration: 0.32, ease: EASE }}
            style={{ ["--sheet-w" as string]: `${width}px` }}
            className={cn(
              "fixed z-[61] flex flex-col bg-white",
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[20px] shadow-sheet-up",
              "sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[min(var(--sheet-w),100vw)] sm:rounded-none sm:shadow-sheet",
            )}
          >
            <div className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 sm:px-7 sm:py-5">
              <h2 id={titleId} className="m-0 text-[20px] font-extrabold tracking-[-0.01em] text-ink">
                {title}
              </h2>
              <IconButton icon="close" label="Close" onClick={onClose} />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2.5 border-t border-divider px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                {footer}
              </div>
            )}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
