import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { hasStepUpTicketFor } from "@/lib/security/step-up";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export default async function ResetPasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/forgot-password?error=link_expired");
  if (!(await hasStepUpTicketFor("recovery", user.id))) {
    redirect("/auth/forgot-password?error=link_expired");
  }

  return (
    <NewPasswordForm
      intent="recovery"
      heading="Set a new password"
      sub="Choose a fresh password for your Kipita account."
      cta="Update password"
      redirectTo="/home"
    />
  );
}
