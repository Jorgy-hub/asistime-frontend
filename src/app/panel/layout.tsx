"use client";
import { useAuth } from "@/context/AuthProvider";
import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar/sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  const title = useMemo(() => {
    if (pathname === "/panel") return "Home";
    const last = pathname.split("/").filter(Boolean).pop() || "Panel";
    return last.charAt(0).toUpperCase() + last.slice(1);
  }, [pathname]);

  const segments = pathname.split("/").filter(Boolean);
  const extra = segments.slice(1);

  // Role label logic
  const roleLabel = useMemo(() => {
    if (!user) return "Guest";
    if (user.role) {
      return String(user.role)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    if (user.admin) return "Admin";
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions[0];
    }
    return "User";
  }, [user]);

  if (!token) return null;

  return (
    <div className="flex h-screen">
      <Sidebar admin={!!user?.admin} />
      <div className="flex flex-col flex-1 bg-zinc-950 overflow-hidden">
        <div className="flex flex-col flex-1 bg-zinc-900 overflow-hidden">
          <div className="px-8 pt-6 pb-4 border-b border-zinc-700 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white tracking-wide">{title}</h1>
              <nav className="flex items-center gap-1 text-xs mt-1">
                <button
                  onClick={() => router.push("/panel")}
                  className="text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  /panel
                </button>
                {extra.map((seg, idx) => {
                  const href = "/panel/" + extra.slice(0, idx + 1).join("/");
                  const label = seg.charAt(0).toUpperCase() + seg.slice(1);
                  const isLast = idx === extra.length - 1;
                  return (
                    <span key={href} className="flex items-center gap-1">
                      <span className="text-zinc-500">/</span>
                      {isLast ? (
                        <span className="text-zinc-300">{label}</span>
                      ) : (
                        <button
                          onClick={() => router.push(href)}
                          className="text-zinc-400 hover:text-amber-400 transition-colors"
                        >
                          {label}
                        </button>
                      )}
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">
                  {user?.username || "User"}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-amber-400">
                  {roleLabel}
                </span>
              </div>
              <div
                className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white"
                aria-label="User menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="white"
                  viewBox="0 0 24 24"
                  strokeWidth={0.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0 sm:p-4 bg-gradient-to-b from-zinc-800 to-zinc-800/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}