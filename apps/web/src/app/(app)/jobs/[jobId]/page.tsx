import type { Metadata } from "next";
import View from "./view";

// Rendered in the browser with the user's session (see useWorkspace), so this route
// can't be prerendered for instant navigation.
export const instant = false;

export const metadata: Metadata = { title: "Clips" };

export default View;
