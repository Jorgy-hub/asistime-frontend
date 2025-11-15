"use client";
import { useAuth } from "@/context/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminUsersManager from "../../../components/admin/AdminUsersManager";
import StudentsExcelImporter from "@/components/admin/StudentsExcelImporter";

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.admin) router.replace("/panel");
  }, [user, router]);

  if (!user?.admin || !token) return null;

  return (
    <div className="px-2 py-1 text-white space-y-6">
      <div className="p-2">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Importar Estudiantes</h1>
        <StudentsExcelImporter />
      </div>
      <AdminUsersManager token={token} />
    </div>
  );
}