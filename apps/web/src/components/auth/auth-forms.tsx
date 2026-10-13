"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="font-heading font-soft text-3xl font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
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
        subtitle="Sign in to your ClipPro account."
      />
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <ErrorAlert message={error ?? linkError} />
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
            />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="ml-auto text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Spinner />} Sign in
          </Button>
          <FieldDescription className="text-center">
            New to ClipPro? <Link href="/sign-up">Create an account</Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const { pending, error, setError, run } = useSubmit();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== form.get("confirm"))
      return setError("The passwords don't match.");
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
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Header
        title="Create your account"
        subtitle="Start turning long videos into clips."
      />
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <ErrorAlert message={error} />
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            <FieldDescription>
              At least {MIN_PASSWORD} characters.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Spinner />} Create account
          </Button>
          <FieldDescription className="text-center">
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </FieldDescription>
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
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
              />
            </Field>
            <Button type="submit" size="lg" disabled={pending}>
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
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Spinner />} Update password
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
