import type { Metadata } from "next";
import { CopilotCreate } from "@/components/dashboard/copilot-create";

export const metadata: Metadata = {
  title: "Create a payment link",
};

export default function CreateLinkPage() {
  return <CopilotCreate />;
}
