import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

/** Reached after the email magic link verifies the account. */
export default async function SetPasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/sign-up");
  return (
    <NewPasswordForm
      step={2}
      heading="Secure your account"
      sub="Email confirmed! Set a password so you can sign in any time."
      cta="Save password"
      redirectTo="/profile/edit?welcome=1"
    />
  );
}
