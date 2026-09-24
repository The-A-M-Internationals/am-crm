"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, UserPlus, Users } from "lucide-react";

interface TaskMultiAssigneeMenuProps {
  task: any;
  users: any[];
  onToggleAssignee: (task: any, employeeId: string) => Promise<void>;
  disabled?: boolean;
}

export default function TaskMultiAssigneeMenu({
  task,
  users,
  onToggleAssignee,
  disabled = false,
}: TaskMultiAssigneeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentAssignees: string[] = Array.isArray(task.assignedTo)
    ? task.assignedTo.filter(Boolean)
    : task.assignedTo
    ? [task.assignedTo]
    : [];

  const assignedUsers = users.filter((u) => currentAssignees.includes(u.uid));

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (uid: string) => {
    try {
      setLoadingUid(uid);
      await onToggleAssignee(task, uid);
    } finally {
      setLoadingUid(null);
    }
  };

  const getButtonLabel = () => {
    if (currentAssignees.length === 0) {
      return (
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <UserPlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Assign...</span>
        </span>
      );
    }
    if (currentAssignees.length === 1) {
      const u = assignedUsers[0];
      return (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black flex items-center justify-center shrink-0">
            {(u?.name || "?").charAt(0).toUpperCase()}
          </span>
          <span className="truncate font-semibold text-slate-800">{u?.name || "1 Member"}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
          {currentAssignees.length}
        </span>
        <span className="truncate font-semibold text-slate-800">
          {assignedUsers[0]?.name?.split(" ")[0] || "Team"}
        </span>
        <span className="text-[10px] font-bold text-indigo-600 shrink-0">
          +{currentAssignees.length - 1}
        </span>
      </span>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium px-2.5 h-9 outline-none focus:border-[#C9A84C] cursor-pointer shadow-sm w-36 flex items-center justify-between gap-1 transition-all disabled:opacity-50"
        title={
          assignedUsers.length > 0
            ? `Assigned: ${assignedUsers.map((u) => u.name).join(", ")}`
            : "Assign team members"
        }
      >
        <div className="truncate flex-1 text-left">{getButtonLabel()}</div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-800">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold">Assign Team</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {currentAssignees.length} selected
            </span>
          </div>

          {/* Search box if > 4 users */}
          {users.length > 4 && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#C9A84C] text-slate-800 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Employee list */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No employees found</p>
            ) : (
              filteredUsers.map((user) => {
                const isChecked = currentAssignees.includes(user.uid);
                const isLoading = loadingUid === user.uid;

                return (
                  <div
                    key={user.uid}
                    onClick={() => handleToggle(user.uid)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-50/80 text-indigo-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          isChecked
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="truncate leading-tight">{user.name}</p>
                        {user.role && (
                          <p className="text-[10px] text-slate-400 capitalize leading-tight">
                            {user.role}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isLoading ? (
                          <span className="w-2 h-2 rounded-full border border-indigo-200 border-t-white animate-spin"></span>
                        ) : isChecked ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Multiple employees can work on this task</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
