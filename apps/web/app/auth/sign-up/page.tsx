import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/security/redirect";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAuthUser();
  const { next } = await searchParams;
  const target = safeNextPath(next);
  if (user) redirect(target);
  return <SignUpForm next={target} />;
}
