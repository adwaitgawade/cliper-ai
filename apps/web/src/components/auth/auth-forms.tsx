"use client";

import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// Tall, flat fields with a hairline focus border instead of a glow, and a button that
// shares their height and radius so the form reads as one column of blocks.
const INPUT =
  "h-14 rounded-lg border-transparent bg-field px-5 text-base placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-0 md:text-[1.0625rem] dark:bg-field dark:focus-visible:bg-white/[0.09]";
const SUBMIT =
  "mt-3 h-14 rounded-lg bg-cta text-base font-medium text-white hover:bg-cta/90 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-[1.0625rem]";
const LINK =
  "text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary";

function AuthInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input className={cn(INPUT, className)} {...props} />;
}

// Sign-up password rules, checked in the browser only.
const PASSWORD_RULES = [
  {
    label: `At least ${MIN_PASSWORD} characters`,
    test: (p: string) => p.length >= MIN_PASSWORD,
  },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  {
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9\s]/.test(p),
  },
];

function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="grid gap-x-4 gap-y-1.5 pt-1 text-sm sm:grid-cols-2">
      {PASSWORD_RULES.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 transition-colors",
              met
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check className="size-4 shrink-0" strokeWidth={2.5} />
            ) : (
              <Circle className="size-4 shrink-0" strokeWidth={1.5} />
            )}
            {label}
            <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PasswordInput(props: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <AuthInput
        type={visible ? "text" : "password"}
        className="pr-14"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        {visible ? (
          <EyeOff className="size-[22px]" strokeWidth={1.5} />
        ) : (
          <Eye className="size-[22px]" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}

function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-10 space-y-3">
      <h1 className="font-heading font-soft text-4xl leading-[1.05] font-semibold tracking-[-0.035em] sm:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };
  return { pending, error, setError, run };
}

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { pending, error, run } = useSubmit();
  const linkError = params.get("error");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(async () => {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) throw error;
      router.replace(safeNext(params.get("next")));
      router.refresh();
    });
  };

  return (
    <>
      <Header
        title="Welcome back"
        subtitle={
          <>
            New to ClipPro?{" "}
            <Link href="/sign-up" className={LINK}>
              Create an account
            </Link>
          </>
        }
      />
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <ErrorAlert message={error ?? linkError} />
          <Field>
            <FieldLabel htmlFor="email" className="sr-only">
              Email
            </FieldLabel>
            <AuthInput
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password" className="sr-only">
              Password
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              required
            />
            <Link
              href="/forgot-password"
              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </Field>
          <Button type="submit" size="lg" className={SUBMIT} disabled={pending}>
            {pending && <Spinner />} Sign in
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const { pending, error, setError, run } = useSubmit();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    if (!PASSWORD_RULES.every((r) => r.test(password)))
      return setError("Your password doesn't meet all the rules yet.");
    if (!agreed) return setError("Please accept the Terms and Privacy Policy.");
    run(async () => {
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace("/dashboard"); // email confirmation is off
        router.refresh();
      } else {
        setSentTo(email);
      }
    });
  };

  if (sentTo) {
    return (
      <>
        <Header
          title="Check your inbox"
          subtitle={<>We sent a confirmation link to {sentTo}.</>}
        />
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Almost there</AlertTitle>
          <AlertDescription>
            Open the link in the email to activate your account, then sign in.
          </AlertDescription>
        </Alert>
        <Button
          asChild
          variant="outline"
          className="mt-6 h-12 w-full rounded-xl text-base"
        >
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Header
        title="Create an account"
        subtitle={
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className={LINK}>
              Sign in
            </Link>
          </>
        }
      />
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <ErrorAlert message={error} />
          <Field>
            <FieldLabel htmlFor="email" className="sr-only">
              Email
            </FieldLabel>
            <AuthInput
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password" className="sr-only">
              Password
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-rules"
              required
            />
            <PasswordRules id="password-rules" password={password} />
          </Field>
          <Field orientation="horizontal" className="pt-1">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="size-[22px] rounded-[5px] border-foreground/25 data-checked:border-foreground data-checked:bg-foreground data-checked:text-background dark:data-checked:bg-foreground [&_svg]:!size-4 [&_svg]:stroke-[3]"
            />
            <FieldLabel
              htmlFor="terms"
              className="pl-1 text-[0.9375rem] font-normal text-muted-foreground"
            >
              <span>
                I agree to the{" "}
                {SITE_URL ? (
                  <>
                    <a
                      href={`${SITE_URL}/terms`}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK}
                    >
                      Terms
                    </a>{" "}
                    and{" "}
                    <a
                      href={`${SITE_URL}/privacy`}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK}
                    >
                      Privacy Policy
                    </a>
                  </>
                ) : (
                  "Terms and Privacy Policy"
                )}
              </span>
            </FieldLabel>
          </Field>
          <Button type="submit" size="lg" className={SUBMIT} disabled={pending}>
            {pending && <Spinner />} Create account
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}

export function ForgotPasswordForm() {
  const { pending, error, run } = useSubmit();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    run(async () => {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    });
  };

  return (
    <>
      <Header
        title="Reset your password"
        subtitle="We'll email you a link to choose a new one."
      />
      {sent ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Email sent</AlertTitle>
          <AlertDescription>
            If an account exists for that address, the reset link is on its way.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <ErrorAlert message={error} />
            <Field>
              <FieldLabel htmlFor="email" className="sr-only">
                Email
              </FieldLabel>
              <AuthInput
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
                autoFocus
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className={SUBMIT}
              disabled={pending}
            >
              {pending && <Spinner />} Send reset link
            </Button>
          </FieldGroup>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { pending, error, setError, run } = useSubmit();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== form.get("confirm"))
      return setError("The passwords don't match.");
    run(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      router.replace("/dashboard");
    });
  };

  return (
    <>
      <Header
        title="Choose a new password"
        subtitle="You'll stay signed in on this device."
      />
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <ErrorAlert message={error} />
          <Field>
            <FieldLabel htmlFor="password" className="sr-only">
              New password
            </FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              placeholder={`New password (at least ${MIN_PASSWORD} characters)`}
              autoComplete="new-password"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm" className="sr-only">
              Confirm password
            </FieldLabel>
            <PasswordInput
              id="confirm"
              name="confirm"
              placeholder="Confirm password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" size="lg" className={SUBMIT} disabled={pending}>
            {pending && <Spinner />} Update password
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
