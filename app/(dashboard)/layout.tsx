"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/sidebar";
import { PipelineService } from "@/lib/pipeline-service";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      PipelineService.initGlobalPipelineListener();
    }
  }, [user, loading, router]);

  // Full navy loading screen — no white flash
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #08112a 100%)",
        }}
      >
        {/* A&M logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))",
            border: "1px solid rgba(201,168,76,0.3)",
          }}
        >
          <span
            style={{
              color: "#C9A84C",
              fontFamily: "var(--font-playfair)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            A&M
          </span>
        </div>

        {/* Spinner */}
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "rgba(201,168,76,0.3)",
            borderTopColor: "#C9A84C",
          }}
        />

        {/* Text */}
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: "rgba(201,168,76,0.5)" }}
        >
          Loading...
        </p>
      </div>
    );
  }

  // Not logged in — show nothing while redirect happens
  if (!user) {
    return (
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #08112a 100%)",
        }}
      />
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f0f2f8" }}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
