import { redirect } from "next/navigation";

// proxy.ts sends signed-out visitors to /sign-in before this runs.
export default function Home() {
  redirect("/dashboard");
}
