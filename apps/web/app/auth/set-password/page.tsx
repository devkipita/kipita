import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { hasStepUpTicketFor } from "@/lib/security/step-up";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export default async function SetPasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/sign-up");
  if (!(await hasStepUpTicketFor("signup", user.id))) redirect("/home");

  return (
    <NewPasswordForm
      intent="signup"
      step={2}
      heading="Secure your account"
      sub="Email confirmed! Set a password so you can sign in any time."
      cta="Save password"
      redirectTo="/profile/edit?welcome=1"
    />
  );
}
