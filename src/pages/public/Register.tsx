import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, errorMessage } from "../../api/client";
import type { RegisterRequest } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { homePath } from "../../auth/roles";
import { LoadBar } from "../../components/brand/LoadBar";
import { Button } from "../../components/ui/Button";
import { Field, Input, PasswordInput } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuthScene } from "../../layouts/authScene";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6; // RegisterRequestDto: @Size(min = 6)

type FieldName = keyof RegisterRequest;
type Errors = Partial<Record<FieldName, string>>;

const empty: RegisterRequest = { name: "", universityId: "", contactNo: "", email: "", password: "" };

/** Live password hint from 02_Register: neutral → "N more characters needed" → "Password length is fine". */
function PasswordHint({ length }: { length: number }) {
  if (length === 0) {
    return (
      <span className="flex items-center gap-1.5 text-muted">
        <Icon name="info" size={16} strokeWidth={2} />
        At least {MIN_PASSWORD} characters
      </span>
    );
  }
  if (length < MIN_PASSWORD) {
    const missing = MIN_PASSWORD - length;
    return (
      <span className="flex items-center gap-1.5 font-semibold text-danger-text">
        <Icon name="alert" size={16} strokeWidth={2} />
        {missing} more {missing === 1 ? "character" : "characters"} needed (minimum {MIN_PASSWORD})
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 font-semibold text-success-ink">
      <Icon name="checkCircle" size={16} strokeWidth={2.2} />
      Password length is fine
    </span>
  );
}

export default function Register() {
  return (
    <AuthLayout wide athlete="raise">
      <RegisterForm />
    </AuthLayout>
  );
}

/** The form sits inside AuthLayout so it can reach the lateral-raise athlete through useAuthScene(). */
function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const lifter = useAuthScene();
  const [form, setForm] = useState<RegisterRequest>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(0);

  // "Load the bar": one plate per required field that is filled in correctly
  const loaded = [
    form.name.trim() !== "",
    form.universityId.trim() !== "",
    EMAIL.test(form.email.trim()),
    form.password.length >= MIN_PASSWORD,
  ];
  const plates = loaded.filter(Boolean).length;
  const lastPlates = useRef(plates);
  useEffect(() => {
    if (plates > lastPlates.current) {
      lifter?.bump(0.5);
      if (plates === loaded.length) lifter?.set("hold"); // every field done: the athlete holds the raise
    }
    lastPlates.current = plates;
  }, [plates, loaded.length, lifter]);

  const set = (name: FieldName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    if (errors[name]) setErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  // Same rules as RegisterRequestDto, so most mistakes are caught before the round trip
  function validate(): Errors {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.universityId.trim()) next.universityId = "University ID is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL.test(form.email.trim())) next.email = "Email must be valid";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < MIN_PASSWORD) next.password = `Password must be at least ${MIN_PASSWORD} characters`;
    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      lifter?.set("fail");
      setShake((n) => n + 1);
      return;
    }

    setSubmitting(true);
    lifter?.set("effort");
    try {
      const user = await register({
        name: form.name.trim(),
        universityId: form.universityId.trim(),
        contactNo: form.contactNo.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(homePath(user.roleName), { replace: true });
    } catch (err) {
      lifter?.set("fail");
      setShake((n) => n + 1);
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors as Errors);
      } else if (err instanceof ApiError && /email/i.test(err.message)) {
        setErrors({ email: err.message }); // "Email already registered"
      } else if (err instanceof ApiError && /university id/i.test(err.message)) {
        setErrors({ universityId: err.message }); // "University ID already registered"
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
      if (lifter?.mode === "effort") lifter.set("normal");
    }
  }

  return (
    <>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6 lg:gap-[26px]">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.015em] text-ink lg:text-[30px]">
            Create your account
          </h1>
          <p className="m-0 text-body text-muted">For students and university staff.</p>
        </div>

        {formError && <Alert tone="danger">{formError}</Alert>}

        <div className="flex flex-col gap-4 lg:gap-[18px]">
          <Field label="Full name" error={errors.name}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} autoComplete="name" placeholder="e.g. Praveen Perera" value={form.name} onChange={set("name")} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="University ID" error={errors.universityId}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="e.g. IT24103257"
                  value={form.universityId}
                  onChange={set("universityId")}
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </Field>
            <Field label="Contact number" optional error={errors.contactNo}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="tel" autoComplete="tel" placeholder="07X XXX XXXX" value={form.contactNo} onChange={set("contactNo")} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
          </div>

          <Field label="Email" error={errors.email}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="email" autoComplete="email" placeholder="you@campus.ac.lk" value={form.email} onChange={set("email")} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>

          <Field
            label="Password"
            error={errors.password}
            hint={
              <span aria-live="polite">
                <PasswordHint length={form.password.length} />
              </span>
            }
          >
            {({ id, describedBy, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete="new-password"
                placeholder="Choose a password"
                value={form.password}
                onChange={set("password")}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </Field>
        </div>

        <LoadBar loaded={loaded} bonus={form.contactNo.trim() !== ""} shake={shake} />

        <Button type="submit" size="lg" block loading={submitting}>
          Create account
        </Button>

        <p className="m-0 text-center text-[14px] text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-bold no-underline hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}
