"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ClientProfile } from "@/lib/types";
import { PENDING_CLIENT_KEY } from "@/lib/constants";
import { ClientIntakeForm } from "@/components/intake/ClientIntakeForm";

export default function ClientInputPage() {
  const router = useRouter();

  function handleSubmit(client: ClientProfile) {
    try {
      sessionStorage.setItem(PENDING_CLIENT_KEY, JSON.stringify(client));
      router.push("/analysis/live");
    } catch {
      toast.error("Could not start analysis. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ClientIntakeForm onSubmit={handleSubmit} />
    </div>
  );
}
