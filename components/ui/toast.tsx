"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastFunction: (message: string, type?: ToastType) => void = () => {};

export function toast(message: string, type: ToastType = "info") {
  toastFunction(message, type);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastFunction = (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              t.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
              t.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
              "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {t.type === "success" && "✅"}
            {t.type === "error" && "❌"}
            {t.type === "info" && "ℹ️"}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
