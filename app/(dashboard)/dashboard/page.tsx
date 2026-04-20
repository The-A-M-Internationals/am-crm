"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Stats {
  totalLeads: number;
  activeClients: number;
  openProjects: number;
  pendingTasks: number;
  wonLeads: number;
  lostLeads: number;
}

const SERVICE_LABELS: Record<string, string> = {
  "digital-marketing": "Digital Marketing",
  "ui-ux": "UI/UX Design",
  "web-development": "Web Development",
};

const SERVICE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "digital-marketing": { bg: "#e8f4ff", text: "#1a6bc4", dot: "#1a6bc4" },
  "ui-ux": { bg: "#fff3e0", text: "#b35a00", dot: "#f59e0b" },
  "web-development": { bg: "#e8fff3", text: "#0a7a3e", dot: "#22c55e" },
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  lead: { bg: "#f3e8ff", text: "#7e22ce" },
  meeting: { bg: "#fff7ed", text: "#c2410c" },
  proposal: { bg: "#eff6ff", text: "#1d4ed8" },
  won: { bg: "#f0fdf4", text: "#15803d" },
  lost: { bg: "#fef2f2", text: "#b91c1c" },
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ background: color, opacity: 0.7 }} />
      <p className="text-xs font-medium mb-1 mt-1" style={{ color: "#6b7280" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: "#1a1a2e" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { crmUser } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, activeClients: 0, openProjects: 0, pendingTasks: 0, wonLeads: 0, lostLeads: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsSnap, clientsSnap, projectsSnap, tasksSnap] = await Promise.all([
          getDocs(collection(db, "leads")),
          getDocs(query(collection(db, "clients"), where("status", "==", "active"))),
          getDocs(query(collection(db, "projects"), where("status", "in", ["in-progress", "not-started"]))),
          getDocs(query(collection(db, "tasks"), where("done", "==", false))),
        ]);

        const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const won = leads.filter((l: any) => l.stage === "won").length;
        const lost = leads.filter((l: any) => l.stage === "lost").length;

        setStats({
          totalLeads: leads.length,
          activeClients: clientsSnap.size,
          openProjects: projectsSnap.size,
          pendingTasks: tasksSnap.size,
          wonLeads: won,
          lostLeads: lost,
        });

        const sorted = leads.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentLeads(sorted.slice(0, 5));

        const allTasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(allTasks.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = crmUser?.name?.split(" ")[0] ?? "there";

  const winRate = stats.totalLeads > 0
    ? Math.round((stats.wonLeads / stats.totalLeads) * 100)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "#C9A84C" }}>
              {greeting},
            </p>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>
              {firstName} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
              Here's what's happening with your team today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "#e8fff3", color: "#0a7a3e" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              CRM Active
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={stats.totalLeads} sub={`${stats.wonLeads} won · ${stats.lostLeads} lost`} color="#C9A84C" />
        <StatCard label="Active Clients" value={stats.activeClients} sub="Ongoing relationships" color="#3b82f6" />
        <StatCard label="Open Projects" value={stats.openProjects} sub="In progress / not started" color="#8b5cf6" />
        <StatCard label="Pending Tasks" value={stats.pendingTasks} sub="Across all team members" color="#f59e0b" />
      </div>

      {/* Win rate + pipeline summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Win rate */}
        <div className="crm-card flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke="#C9A84C" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - winRate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold" style={{ color: "#0D1B3E" }}>{winRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Win Rate</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#0D1B3E" }}>{stats.wonLeads} Won</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>{stats.lostLeads} lost · {stats.totalLeads} total</p>
          </div>
        </div>

        {/* Pipeline by stage */}
        <div className="crm-card col-span-2">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#6b7280" }}>Pipeline Stages</p>
          <div className="flex gap-2">
            {["lead", "meeting", "proposal", "won", "lost"].map((stage) => {
              const count = recentLeads.filter((l: any) => l.stage === stage).length;
              const colors = STAGE_COLORS[stage];
              return (
                <div key={stage} className="flex-1 text-center p-3 rounded-lg" style={{ background: colors.bg }}>
                  <p className="text-lg font-bold" style={{ color: colors.text }}>{count}</p>
                  <p className="text-xs capitalize font-medium mt-0.5" style={{ color: colors.text }}>{stage}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Leads */}
        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>Recent Leads</h2>
            <a href="/leads" className="text-xs font-medium" style={{ color: "#C9A84C" }}>View all →</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "#f3f4f6" }} />
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "#9ca3af" }}>No leads yet. Add your first lead!</p>
              <a href="/leads" className="inline-block mt-3 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#0D1B3E" }}>
                + Add Lead
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead: any) => {
                const svc = SERVICE_COLORS[lead.service] ?? SERVICE_COLORS["web-development"];
                const stg = STAGE_COLORS[lead.stage] ?? STAGE_COLORS["lead"];
                return (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: "#0D1B3E1a", color: "#0D1B3E" }}>
                      {lead.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a1a2e" }}>{lead.name}</p>
                      <p className="text-xs truncate" style={{ color: "#6b7280" }}>{lead.company}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="badge" style={{ background: svc.bg, color: svc.text }}>
                        {SERVICE_LABELS[lead.service]?.split(" ")[0]}
                      </span>
                      <span className="badge" style={{ background: stg.bg, color: stg.text, textTransform: "capitalize" }}>
                        {lead.stage}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Tasks */}
        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>Pending Tasks</h2>
            <a href="/tasks" className="text-xs font-medium" style={{ color: "#C9A84C" }}>View all →</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "#f3f4f6" }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "#9ca3af" }}>All tasks are done! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: any) => {
                const priorityColors: Record<string, string> = {
                  high: "#ef4444",
                  medium: "#f59e0b",
                  low: "#22c55e",
                };
                return (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: priorityColors[task.priority] ?? "#9ca3af" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a1a2e" }}>{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                          Due {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full flex-shrink-0" style={{
                      background: `${priorityColors[task.priority]}15`,
                      color: priorityColors[task.priority] ?? "#9ca3af"
                    }}>
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
