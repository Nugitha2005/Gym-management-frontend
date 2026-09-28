import { useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { fitnessApi } from "../../api/endpoints";
import type { FitnessProfile, User } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { roleLabel } from "../../auth/roles";
import { BmiPanel } from "../../components/domain/BmiPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { Field, Input } from "../../components/ui/Field";
import { Alert, EmptyState } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { useMemberLookup } from "../../hooks/useMemberLookup";
import { goalLabel } from "../../lib/domain";
import { fmtDate } from "../../lib/format";
import { Rise, Stagger } from "../../lib/motion";

/** 21_Trainer_Member_fitness / 26_Doctor_Member_fitness — read-only view of a member's profile. */
export default function MemberFitness() {
  const viewer = useUser();
  const { lookup, error: lookupError, setError, loading } = useMemberLookup();
  const [id, setId] = useState("");
  const [member, setMember] = useState<User | null>(null);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoadError(null);
    const found = await lookup(id);
    setMember(found);
    setProfile(null);
    if (!found) return;
    setLoadingProfile(true);
    try {
      setProfile(await fitnessApi.forUser(found.userId));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) setLoadError(errorMessage(err));
    } finally {
      setLoadingProfile(false);
    }
  }

  const eyebrow = viewer.roleName === "DOCTOR" ? "Doctor · Members" : viewer.roleName === "ADMIN" ? "Admin · Members" : "Front desk · Members";
  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title="Member fitness" description="Look up a member to see their fitness profile. Only the member can change it." />

      <Card aria-label="Look up a member">
        <form noValidate onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field label="Member ID" className="flex-1 sm:max-w-md" error={lookupError}>
            {({ id: inputId, describedBy, invalid }) => (
              <Input
                id={inputId}
                placeholder="e.g. IT24103257"
                autoComplete="off"
                autoCapitalize="characters"
                value={id}
                onChange={(e) => {
                  setId(e.target.value.toUpperCase());
                  setError(null);
                }}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </Field>
          <Button type="submit" size="lg" icon="search" loading={loading || loadingProfile} className="h-12 sm:mt-[30px]">
            Look up
          </Button>
        </form>
      </Card>

      {loadError && <Alert tone="danger">{loadError}</Alert>}

      {member && !loadingProfile && !loadError && (
        <Rise standalone className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
          <Card aria-label="Fitness profile" className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">{member.name}</h2>
                <p className="m-0 text-[14px] text-muted">
                  {member.universityId} · {roleLabel(member.roleName)}
                </p>
              </div>
              <Badge tone="neutral" dot={false} size="sm">
                Read-only
              </Badge>
            </div>
            {profile ? (
              <>
                <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Height", `${profile.heightCm} cm`],
                    ["Weight", `${profile.weightKg} kg`],
                    ["Goal", goalLabel[profile.goalType]],
                    ["Target weight", profile.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 rounded-control bg-off-white p-3">
                      <dt className="text-label font-bold tracking-label text-muted uppercase">{label}</dt>
                      <dd className="m-0 text-[16px] font-bold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col gap-1">
                  <span className="text-label font-bold tracking-label text-muted uppercase">Medical notes</span>
                  <p className="m-0 text-body">{profile.medicalNotes || <span className="text-muted">None</span>}</p>
                </div>
                {profile.lastUpdated && <p className="m-0 text-[13px] text-muted">Last updated by the member on {fmtDate(profile.lastUpdated)}.</p>}
              </>
            ) : (
              <EmptyState icon="pulse" title="No fitness profile yet">
                {member.name.split(" ")[0]} has not filled in a fitness profile yet.
              </EmptyState>
            )}
          </Card>
          {profile && (
            <Card aria-labelledby="mf-bmi" className="flex flex-col gap-5">
              <CardHeader icon="grid" title="Body mass index (BMI)" titleId="mf-bmi" />
              <BmiPanel bmi={profile.bmi} category={profile.bmiCategory} />
            </Card>
          )}
        </Rise>
      )}
    </Stagger>
  );
}
