"use client";
import { useAuth } from "@/context/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminUsersManager from "../../../components/admin/AdminUsersManager";

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.admin) router.replace("/panel");
  }, [user, router]);

  if (!user?.admin || !token) return null;

  return (
    <div className="px-2 py-1 text-white space-y-6">
      <AdminUsersManager token={token} />
    </div>
  );
}