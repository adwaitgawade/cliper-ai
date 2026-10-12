"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace";

function PasswordCard() {
  const [pending, setPending] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const password = String(form.get("password"));
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== form.get("confirm"))
      return toast.error("The passwords don't match.");
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error) return toast.error(error.message);
    formEl.reset();
    toast.success("Password updated");
  };
  return (
    <Card>
      {/* display: contents keeps the card's own spacing between header, content and footer */}
      <form onSubmit={submit} className="contents">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Choose a new password for signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
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
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />} Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function AccountSettingsPage() {
  const { me } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" value={me.email ?? ""} readOnly disabled />
          </Field>
          <Field>
            <FieldLabel>Theme</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={theme}
              onValueChange={(t) => t && setTheme(t)}
              className="justify-start"
            >
              <ToggleGroupItem value="light">
                <Sun /> Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon /> Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system">
                <Monitor /> System
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/sign-in");
              router.refresh();
            }}
          >
            Sign out
          </Button>
        </CardFooter>
      </Card>
      <PasswordCard />
    </div>
  );
}
