import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { errorMessage } from "../../api/client";
import { checkInApi } from "../../api/endpoints";
import { Logo } from "../../components/brand/Logo";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { Alert, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { fmtDate, fmtTime } from "../../lib/format";
import { Stagger } from "../../lib/motion";

/** Theme colour as #rrggbb for the QR library (the palette lives only in theme.css). */
function themeColor(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * 22_Trainer_Gym_QR_code / 29_Admin_Gym_QR_code — the code members scan at the door.
 * Only the admin can reset it (PUT /api/checkin/qr/reset).
 */
export default function GymQr({ canReset = false }: { canReset?: boolean }) {
  const toast = useToast();
  const qr = useApi(checkInApi.qr);
  const [image, setImage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const code = qr.data?.code;
    if (!code) return;
    let cancelled = false;
    QRCode.toDataURL(code, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: themeColor("--color-navy"), light: themeColor("--color-white") },
    }).then((url) => !cancelled && setImage(url));
    return () => {
      cancelled = true;
    };
  }, [qr.data?.code]);

  async function reset() {
    setResetting(true);
    setResetError(null);
    try {
      const fresh = await checkInApi.resetQr();
      qr.setData(fresh);
      setConfirming(false);
      toast("New gym code created. Print it and put it up at the door.");
    } catch (err) {
      setResetError(errorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow={canReset ? "Admin · Access" : "Front desk · Access"}
        title="Gym QR code"
        description="Members scan this code at the door to check in and out."
        actions={
          <Button icon="printer" onClick={() => window.print()} disabled={!image}>
            Print
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <Card aria-label="Current gym code" className="print-area flex flex-col items-center gap-6 py-8 text-center">
          <div className="hidden print:block">
            <Logo size="lg" tone="dark" />
            <p className="mt-4 mb-0 text-[28px] font-extrabold">Scan to check in or out</p>
          </div>
          {qr.loading && !qr.data ? (
            <Skeleton className="h-64 w-64" />
          ) : qr.error ? (
            <LoadError error={qr.error} onRetry={() => qr.reload()} />
          ) : (
            <>
              <div className="rounded-[20px] border border-line bg-white p-4 shadow-card">
                {image ? (
                  <img src={image} alt={`Gym QR code for ${qr.data?.code}`} className="h-60 w-60 sm:h-72 sm:w-72 print:h-[420px] print:w-[420px]" />
                ) : (
                  <Skeleton className="h-60 w-60 sm:h-72 sm:w-72" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label font-bold tracking-eyebrow text-muted uppercase">Code</span>
                <span className="text-[30px] leading-none font-extrabold tracking-[0.08em] tabular-nums sm:text-[36px]">{qr.data?.code}</span>
              </div>
              <p className="m-0 max-w-xs text-[14px] text-muted">Members can type this code if their camera won’t scan.</p>
            </>
          )}
        </Card>

        {canReset ? (
          <Card aria-labelledby="reset-title" className="flex flex-col gap-4">
            <CardHeader icon="refresh" title="Reset the code" titleId="reset-title" />
            <p className="m-0 text-body text-muted">Use this if the code has been shared or copied. A new code is created and the old one stops working.</p>
            <Alert tone="warning">The printed QR code at the door will stop working. Print the new one and put it up straight away.</Alert>
            {qr.data?.createdAt && (
              <p className="m-0 text-[14px] text-muted">
                Last reset: <span className="font-semibold text-ink">{fmtDate(qr.data.createdAt)} at {fmtTime(qr.data.createdAt)}</span>
              </p>
            )}
            <Button variant="danger" icon="refresh" className="self-start" onClick={() => { setResetError(null); setConfirming(true); }}>
              Reset code
            </Button>
          </Card>
        ) : (
          <Card aria-labelledby="qr-help" className="flex flex-col gap-3">
            <CardHeader icon="info" title="Keeping the code safe" titleId="qr-help" />
            <p className="m-0 text-body text-muted">Print the code and fix it next to the gym door. If you think it has been copied or shared, ask an admin to reset it.</p>
            {qr.data?.createdAt && (
              <p className="m-0 text-[14px] text-muted">
                In use since <span className="font-semibold text-ink">{fmtDate(qr.data.createdAt)}</span>
              </p>
            )}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={reset}
        loading={resetting}
        danger
        title="Reset the gym QR code?"
        confirmLabel="Reset code"
        cancelLabel="Keep current code"
      >
        <p className="m-0">
          The printed QR code at the door will stop working as soon as you reset it. Members won’t be able to check in until you print the new code and put it up.
        </p>
        {resetError && (
          <p role="alert" className="m-0 mt-3 font-semibold text-danger-text">
            {resetError}
          </p>
        )}
      </ConfirmDialog>
    </Stagger>
  );
}
