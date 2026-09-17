"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface DialogMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

let showDialogFunction: (message: string, type?: ToastType, title?: string) => void = () => {};

export function toast(message: string, type: ToastType = "info", title?: string) {
  showDialogFunction(message, type, title);
}

// Helper to determine a clean, professional title and body based on message content
function parseDialogContent(rawMessage: string, type: ToastType, customTitle?: string): { title: string; message: string } {
  let message = rawMessage.trim();

  // If custom title is provided, use it
  if (customTitle) {
    return { title: customTitle, message };
  }

  // If message contains colon prefix like "Action Restricted: ..." or "Error: ..."
  if (message.includes(":") && !message.startsWith("http")) {
    const colonIndex = message.indexOf(":");
    const prefix = message.substring(0, colonIndex).trim();
    const rest = message.substring(colonIndex + 1).trim();
    if (prefix.length > 2 && prefix.length < 35 && rest.length > 0) {
      return { title: prefix, message: rest };
    }
  }

  // If message has newlines (e.g. "Failed to send email!\n\nError: ...")
  if (message.includes("\n")) {
    const lines = message.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines[0].length < 60) {
      return { title: lines[0], message: lines.slice(1).join(" ") };
    }
  }

  const lower = message.toLowerCase();
  let title = "Notification";

  if (lower.includes("proposal sent") || lower.includes("invoice email sent")) {
    title = "Email Sent Successfully";
  } else if (lower.includes("email sent")) {
    title = "Email Sent Successfully";
  } else if (lower.includes("saved successfully") || lower.includes("created successfully")) {
    title = "Saved Successfully";
  } else if (lower.includes("updated successfully")) {
    title = "Updated Successfully";
  } else if (lower.includes("deleted successfully")) {
    title = "Deleted Successfully";
  } else if (lower.includes("required") || lower.includes("please enter") || lower.includes("invalid")) {
    title = "Required Information";
  } else if (lower.includes("restricted") || lower.includes("permission") || lower.includes("unauthorized")) {
    title = "Action Restricted";
  } else if (lower.includes("failed") || lower.includes("error")) {
    title = "Action Failed";
  } else if (type === "success") {
    title = "Success";
  } else if (type === "error") {
    title = "Attention Required";
  }

  return { title, message };
}

export function ToastProvider() {
  const [activeDialog, setActiveDialog] = useState<DialogMessage | null>(null);

  useEffect(() => {
    // Connect toast function
    showDialogFunction = (message: string, type: ToastType = "info", title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const parsed = parseDialogContent(message, type, title);
      setActiveDialog({ id, title: parsed.title, message: parsed.message, type });
    };

    // Globally intercept window.alert so native browser alert popups never appear
    if (typeof window !== "undefined") {
      window.alert = (message: string) => {
        const lower = String(message).toLowerCase();
        let type: ToastType = "info";
        if (lower.includes("success") || lower.includes("sent") || lower.includes("saved") || lower.includes("created")) type = "success";
        else if (lower.includes("error") || lower.includes("fail") || lower.includes("required") || lower.includes("restricted")) type = "error";
        showDialogFunction(String(message), type);
      };
    }

    // Keyboard accessibility: ESC or Enter closes the modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        setActiveDialog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeDialog = () => {
    setActiveDialog(null);
  };

  return (
    <AnimatePresence>
      {activeDialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeDialog}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal dialog card - matching reference image design */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-7 sm:p-8 max-w-[490px] w-full border border-gray-100/80 z-10"
          >
            {/* Close 'X' button */}
            <button
              onClick={closeDialog}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl sm:text-[21px] font-bold text-gray-900 pr-8 leading-snug tracking-tight">
              {activeDialog.title}
            </h3>

            {/* Modal Body / Subtitle */}
            <p className="text-[14px] text-gray-500 mt-3 mb-7 leading-relaxed font-normal">
              {activeDialog.message}
            </p>

            {/* Action Button (Left-aligned as in reference screenshot) */}
            <div className="flex items-center gap-3">
              <button
                onClick={closeDialog}
                className="px-7 py-2.5 bg-[#2B0E44] hover:bg-[#3D1460] active:scale-95 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
