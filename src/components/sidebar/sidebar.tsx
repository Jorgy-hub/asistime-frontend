"use client";

import { useAuth } from "@/context/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

interface SidebarProps {
  admin?: boolean;
}

const baseBtn =
  "w-12 h-12 rounded-full p-2 group relative flex items-center justify-center transition-colors cursor-pointer";
const active = "text-white bg-amber-500 ring-4 ring-amber-500/25";
const inactive = "text-zinc-300 hover:text-white hover:bg-zinc-700";

const Sidebar = ({ admin = false }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { setToken, user } = useAuth();

  // Determine admin from prop or user object
  const isAdmin = admin || !!(user as any)?.admin;

  // Normalize permissions from user (array or comma string)
  const permsRaw = (user as any)?.permissions;
  const perms: string[] = Array.isArray(permsRaw)
    ? permsRaw
    : typeof permsRaw === "string"
    ? permsRaw.split(/[,\s]+/).filter(Boolean)
    : [];

  // Show Students if admin OR has "Maestro" permission
  const canSeeStudents = isAdmin || perms.some((p) => p?.toLowerCase?.() === "maestro");

  const links: {
    key: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    hidden?: boolean;
    match?: (p: string) => boolean;
  }[] = [
    {
      key: "home",
      label: "Home",
      path: "/panel",
      match: (p) => p === "/panel",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75V21h5.25v-5.25A1.5 1.5 0 0 1 11.25 14.25h1.5A1.5 1.5 0 0 1 14.25 15.75V21H19.5V9.75" />
        </svg>
      ),
    },
    {
      key: "students",
      label: "Students",
      path: "/panel/students",
      match: (p) => p.startsWith("/panel/students") || p.startsWith("/panel/student"),
      hidden: !canSeeStudents,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
    },
    {
      key: "admin",
      label: "Admin",
      path: "/panel/admin",
      match: (p) => p.startsWith("/panel/admin"),
      hidden: !isAdmin,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-24 h-screen text-white px-4 pt-6 pb-4 bg-zinc-950 flex flex-col">
      {/* Logo */}
      <div className="-mx-4 px-4 flex justify-center pb-4 mb-4 shrink-0 border-zinc-700">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-12 w-12 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 
                    .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 
                    1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 
                    0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 
                    1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 
                    13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 
                    16.5h.75v.75h-.75v-.75Z" />
        </svg>
      </div>

      {/* Centered nav */}
      <nav className="flex-1 flex flex-col items-center justify-top space-y-4">
        {links
          .filter((l) => !l.hidden)
          .map((link) => {
            const isActive = link.match ? link.match(pathname) : pathname === link.path;
            return (
              <button
                key={link.key}
                onClick={() => router.push(link.path)}
                className={`${baseBtn} ${isActive ? active : inactive}`}
                aria-label={link.label}
              >
                {link.icon}
                <span className="absolute top-1/2 -translate-y-1/2 left-16 p-2 rounded-md bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm whitespace-nowrap z-50">
                  {link.label}
                </span>
              </button>
            );
          })}
      </nav>

      {/* Logout pinned bottom */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => {
            setToken(null);
            router.replace("/login");
          }}
          className={`${baseBtn} ${inactive}`}
          aria-label="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 
                     0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          <span className="absolute top-1/2 -translate-y-1/2 left-16 p-2 rounded-md bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm whitespace-nowrap">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;