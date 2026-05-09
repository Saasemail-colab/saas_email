import { AdminLogin } from "@/app/components/admin-login";

export default function AdminLoginPage({
  searchParams
}: {
  searchParams?: { next?: string };
}) {
  return <AdminLogin nextPath={searchParams?.next ?? "/#send"} />;
}
