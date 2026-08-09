import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

/** Reached from a password-recovery email link (session set by the callback). */
export default async function ResetPasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/forgot-password");
  return (
    <NewPasswordForm
      heading="Set a new password"
      sub="Choose a fresh password for your Kipita account."
      cta="Update password"
      redirectTo="/profile"
    />
  );
}
