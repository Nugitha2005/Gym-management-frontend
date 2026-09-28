import { useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { incidentApi } from "../../api/endpoints";
import type { Incident, IncidentSeverity, IncidentType } from "../../api/types";
import { IncidentProgress } from "../../components/domain/IncidentProgress";
import { SeverityBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { incidentTypeLabel } from "../../lib/domain";
import { fmtDayMonth, fmtTime } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const DESC_MAX = 1000;
const LOC_MAX = 100;
type Errors = Partial<Record<"incidentType" | "severity" | "description" | "location", string>>;

export default function Incidents() {
  const toast = useToast();
  const reports = useApi(incidentApi.mine);
  const [type, setType] = useState<IncidentType | null>(null);
  const [severity, setSeverity] = useState<IncidentSeverity | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found: Errors = {};
    if (!type) found.incidentType = "Choose what happened";
    if (!severity) found.severity = "Choose how serious it is";
    if (!description.trim()) found.description = "Describe what happened.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const created = await incidentApi.report({ incidentType: type!, severity: severity!, description: description.trim(), location: location.trim() });
      toast(created.assignedRole === "DOCTOR" ? "Report sent to the university doctor" : "Report sent to the trainers");
      setType(null);
      setSeverity(null);
      setDescription("");
      setLocation("");
      reports.setData((list) => [created, ...(list ?? [])]);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors as Errors);
      else setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const list = [...(reports.data ?? [])].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member · Incidents"
        title="Incidents"
        description="Report an injury, damaged equipment or a problem with the gym. Injuries go to the university doctor; everything else goes to the trainers."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-6">
        <Card aria-labelledby="report-title" className="self-start">
          <form noValidate onSubmit={submit} className="flex flex-col gap-5">
            <CardHeader icon="warning" title="Report an incident" titleId="report-title" />
            <ChoiceGroup<IncidentType>
              label="Type"
              size="sm"
              value={type}
              onChange={setType}
              error={errors.incidentType}
              options={(Object.keys(incidentTypeLabel) as IncidentType[]).map((t) => ({ value: t, label: incidentTypeLabel[t] }))}
            />
            <ChoiceGroup<IncidentSeverity>
              label="Severity"
              columns={3}
              value={severity}
              onChange={setSeverity}
              error={errors.severity}
              options={[
                { value: "LOW", label: "Low", dot: "bg-neutral" },
                { value: "MEDIUM", label: "Medium", dot: "bg-warning" },
                { value: "HIGH", label: "High", dot: "bg-danger" },
              ]}
            />
            <Field label="Description" aside={`${description.length} / ${DESC_MAX}`} error={errors.description}>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  rows={4}
                  maxLength={DESC_MAX}
                  placeholder="What happened? Include the equipment name or number if there is one."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </Field>
            <Field label="Location" optional error={errors.location}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} maxLength={LOC_MAX} placeholder="e.g. Cardio area, treadmill 3" value={location} onChange={(e) => setLocation(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            {formError && (
              <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" loading={submitting} className="self-start">
              Submit report
            </Button>
          </form>
        </Card>

        <section aria-labelledby="my-reports-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="my-reports-title" className="m-0 text-card-title font-bold">
              My reports
            </h2>
            <span className="text-[14px] font-semibold text-muted tabular-nums">{list.length}</span>
          </div>
          {reports.loading && !reports.data ? (
            <Skeleton className="h-40 rounded-card" />
          ) : reports.error ? (
            <LoadError error={reports.error} onRetry={() => reports.reload()} />
          ) : list.length === 0 ? (
            <Card>
              <EmptyState icon="checkCircle" title="No reports">
                Anything you report shows up here with its progress.
              </EmptyState>
            </Card>
          ) : (
            list.map((r) => <ReportCard key={r.incidentId} report={r} />)
          )}
        </section>
      </div>
    </Stagger>
  );
}

function ReportCard({ report }: { report: Incident }) {
  const latest = report.actions[report.actions.length - 1];
  return (
    <Card as="article" aria-label={`${incidentTypeLabel[report.incidentType]} report`} className="flex flex-col gap-3.5" padding="sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-ink">{incidentTypeLabel[report.incidentType]}</span>
        <SeverityBadge severity={report.severity} />
        <span className="ml-auto text-[13px] text-muted tabular-nums">
          {fmtDayMonth(report.reportedAt)} · {fmtTime(report.reportedAt)}
        </span>
      </div>
      <p className="m-0 text-[14px] text-ink">{report.description}</p>
      {report.location && (
        <p className="m-0 inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Icon name="mapPin" size={15} />
          {report.location}
        </p>
      )}
      <IncidentProgress status={report.status} />
      <p className="m-0 text-[13px] text-muted">
        Handled by the {report.assignedRole === "DOCTOR" ? "university doctor" : "trainers"}
        {latest && (
          <>
            {" "}· Latest: <span className="text-ink">{latest.actionTaken}</span>
            {latest.outcome && <> ({latest.outcome})</>}
          </>
        )}
      </p>
    </Card>
  );
}
