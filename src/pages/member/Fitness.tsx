import { useEffect, useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { fitnessApi } from "../../api/endpoints";
import type { FitnessProfile, GoalType } from "../../api/types";
import { BmiPanel } from "../../components/domain/BmiPanel";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { goalLabel } from "../../lib/domain";
import { fmtDate, fmtTime } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const NOTES_MAX = 500;
type Errors = Partial<Record<"heightCm" | "weightKg" | "goalType" | "targetWeightKg" | "medicalNotes", string>>;

/** Same thresholds as FitnessProfile.getBmiCategory() */
function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function Fitness() {
  const toast = useToast();
  const profile = useApi<FitnessProfile | null>(() =>
    fitnessApi.mine().catch((err) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err))),
  );
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once the saved profile arrives
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setHeight(String(p.heightCm));
    setWeight(String(p.weightKg));
    setGoal(p.goalType);
    setTarget(p.targetWeightKg != null ? String(p.targetWeightKg) : "");
    setNotes(p.medicalNotes ?? "");
  }, [profile.data]);

  const h = Number(height);
  const w = Number(weight);
  const liveBmi = h >= 100 && h <= 250 && w >= 30 && w <= 250 ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;

  // FitnessProfileRequestDto ranges
  function validate(): Errors {
    const e: Errors = {};
    if (!height) e.heightCm = "Height is required";
    else if (h < 100 || h > 250) e.heightCm = "Height must be between 100 and 250 cm";
    if (!weight) e.weightKg = "Weight is required";
    else if (w < 30 || w > 250) e.weightKg = "Weight must be between 30 and 250 kg";
    if (!goal) e.goalType = "Choose a goal";
    const t = Number(target);
    if (target && (t < 30 || t > 250)) e.targetWeightKg = "Target weight must be between 30 and 250 kg";
    if (notes.length > NOTES_MAX) e.medicalNotes = `Medical notes must be ${NOTES_MAX} characters or fewer`;
    return e;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const saved = await fitnessApi.save({
        heightCm: h,
        weightKg: w,
        goalType: goal!,
        targetWeightKg: target ? Number(target) : null,
        medicalNotes: notes.trim() || null,
      });
      profile.setData(saved);
      toast("Profile saved");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors as Errors);
      else setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const saved = profile.data;
  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow="Member · Fitness" title="Fitness profile" description="Trainers can see this profile to plan your sessions." />

      {profile.loading && profile.data === undefined ? (
        <Skeleton className="h-96 rounded-card" />
      ) : profile.error ? (
        <LoadError error={profile.error} onRetry={() => profile.reload()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
          <Card aria-labelledby="details-title">
            <form noValidate onSubmit={save} className="flex flex-col gap-5">
              <CardHeader icon="pulse" title="Your details" titleId="details-title" />
              {!saved && (
                <p className="m-0 rounded-control bg-tile p-3.5 text-[14px] text-ocean">
                  You haven't filled in a fitness profile yet. It takes a minute and helps trainers plan with you.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Height (cm)" error={errors.heightCm}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} type="number" inputMode="decimal" min={100} max={250} step="0.1" placeholder="e.g. 172" value={height} onChange={(e) => setHeight(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
                  )}
                </Field>
                <Field label="Weight (kg)" error={errors.weightKg}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} type="number" inputMode="decimal" min={30} max={250} step="0.1" placeholder="e.g. 68" value={weight} onChange={(e) => setWeight(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
                  )}
                </Field>
              </div>
              <ChoiceGroup<GoalType>
                label="Goal"
                value={goal}
                onChange={setGoal}
                error={errors.goalType}
                options={(Object.keys(goalLabel) as GoalType[]).map((g) => ({ value: g, label: goalLabel[g] }))}
              />
              <Field label="Target weight (kg)" optional error={errors.targetWeightKg}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type="number" inputMode="decimal" min={30} max={250} step="0.1" placeholder="e.g. 68" value={target} onChange={(e) => setTarget(e.target.value)} aria-describedby={describedBy} invalid={invalid} className="sm:max-w-[240px]" />
                )}
              </Field>
              <Field label="Medical notes" optional aside={`${notes.length} / ${NOTES_MAX}`} error={errors.medicalNotes} hint="Only trainers, the doctor and admins can see this.">
                {({ id, describedBy, invalid }) => (
                  <Textarea id={id} rows={3} maxLength={NOTES_MAX} placeholder="e.g. Recovering from a knee strain, avoid heavy squats" value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
              {formError && (
                <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
                  {formError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" loading={saving}>
                  Save profile
                </Button>
                {saved?.lastUpdated && (
                  <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success-ink">
                    <Icon name="checkCircle" size={16} strokeWidth={2} />
                    Saved {fmtDate(saved.lastUpdated)} at {fmtTime(saved.lastUpdated)}
                  </span>
                )}
              </div>
            </form>
          </Card>

          <Card aria-labelledby="bmi-title" className="flex flex-col gap-5 self-start">
            <CardHeader icon="grid" title="Body mass index (BMI)" titleId="bmi-title" />
            <BmiPanel bmi={liveBmi ?? saved?.bmi} category={liveBmi != null ? bmiCategory(liveBmi) : saved?.bmiCategory} />
          </Card>
        </div>
      )}
    </Stagger>
  );
}
