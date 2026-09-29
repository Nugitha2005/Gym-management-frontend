import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { homePath } from "../../auth/roles";
import { Button } from "../../components/ui/Button";
import { Field, Input, PasswordInput } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Feedback";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuthScene } from "../../layouts/authScene";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"email" | "password", string>>;

export default function Login() {
  return (
    <AuthLayout athlete="bench">
      <LoginForm />
    </AuthLayout>
  );
}

/** The form sits inside AuthLayout so it can reach the bench-press athlete through useAuthScene(). */
function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const lifter = useAuthScene();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Errors {
    const next: Errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL.test(email.trim())) next.email = "Email must be valid";
    if (!password) next.password = "Password is required";
    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      lifter?.set("fail"); // the bar sinks and shakes
      return;
    }

    setSubmitting(true);
    lifter?.set("effort"); // drive the bar up and hold it while we wait
    try {
      const user = await login(email, password);
      // Go back to the page that asked for a login, if there was one
      navigate(from && from !== "/login" ? from : homePath(user.roleName), { replace: true });
    } catch (err) {
      lifter?.set("fail");
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors as Errors);
      } else {
        // 401 "Invalid email or password", 403 "This account has been deactivated", network errors
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
      if (lifter?.mode === "effort") lifter.set("normal");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6 lg:gap-7">
      <div className="flex flex-col gap-1.5 lg:gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.015em] text-ink lg:text-[30px]">Log in</h1>
        <p className="m-0 text-body text-muted">Welcome back. Use the email you registered with.</p>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      <div className="flex flex-col gap-4 lg:gap-[18px]">
        <Field label="Email" error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              inputSize="lg"
              autoComplete="email"
              placeholder="you@campus.ac.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>
        <Field label="Password" error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              inputSize="lg"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
            />
          )}
        </Field>
      </div>

      <Button type="submit" size="lg" block loading={submitting}>
        Log in
      </Button>

      <p className="m-0 text-center text-[14px] text-muted">
        New here?{" "}
        <Link to="/register" className="font-bold no-underline hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
