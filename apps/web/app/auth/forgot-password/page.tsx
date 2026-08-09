import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getAuthUser();
  if (user) redirect("/profile");
  return <ForgotPasswordForm />;
}
