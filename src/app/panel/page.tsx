"use client";
import EntranceLogs from "@/components/entranceLogs/entranceLogs";
import StudentsStats from "@/components/student/studentStats";
import { useAuth } from "@/context/AuthProvider";
import OccupancyPie from "@/components/charts/OccupancyPie";
import TodayActivityBar from "@/components/charts/TodayActivityBar";

export default function PanelHome() {
  const { user } = useAuth();

  return (
    <div className="px-6 text-white w-full">
      { user?.admin || user?.permissions.includes("Maestro") ? (
        <>
          <StudentsStats />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <div className="h-full">
              <OccupancyPie />
            </div>
            <div className="h-full">
              <TodayActivityBar />
            </div>
          </div>
          <EntranceLogs />
        </>
      ) : null }
    </div>
  );
}

