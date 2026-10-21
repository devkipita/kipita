import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/security/redirect";
import { SignInForm } from "@/components/auth/SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getAuthUser();
  const { next, error } = await searchParams;
  const target = safeNextPath(next);
  if (user) redirect(target);
  return <SignInForm next={target} notice={authErrorMessage(error)} />;
}
