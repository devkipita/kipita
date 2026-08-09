import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { SignInForm } from "@/components/auth/SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAuthUser();
  const { next } = await searchParams;
  if (user) redirect(next ?? "/profile");
  return <SignInForm next={next ?? "/profile"} />;
}
