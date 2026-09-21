import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage() {
  const user = await getAuthUser();
  if (user) redirect("/home");
  return <SignUpForm />;
}
