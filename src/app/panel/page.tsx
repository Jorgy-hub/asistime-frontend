"use client";
import EntranceLogs from "@/components/entranceLogs/entranceLogs";
import StudentsStats from "@/components/student/studentStats";
import { useAuth } from "@/context/AuthProvider";
import OccupancyPie from "@/components/charts/OccupancyPie";
import TodayActivityBar from "@/components/charts/TodayActivityBar";

export default function PanelHome() {
  const { user } = useAuth();

  return (
    <div className="w-full px-3 py-3 text-white sm:px-6 sm:py-4">
      { user?.admin || user?.permissions.includes("Maestro") ? (
        <>
          <StudentsStats />

          <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
            <div className="min-w-0 h-full">
              <OccupancyPie />
            </div>
            <div className="min-w-0 h-full">
              <EntranceLogs />
            </div>
          </div>
          <div className="mt-5 min-w-0">
            <TodayActivityBar />
          </div>
        </>
      ) : null }
    </div>
  );
}

