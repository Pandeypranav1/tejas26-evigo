import { redirect } from "next/navigation";

export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const sp = await searchParams;
  const role = (sp?.role ?? "client").toLowerCase();
  redirect(role === "provider" ? "/login/provider" : "/login/client");
}
