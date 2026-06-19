"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { setCookie } from "cookies-next";

const SERVICES = [
  { icon: "📱", title: "Social Media Marketing", desc: "Instagram, Facebook, LinkedIn — content that converts" },
  { icon: "🎨", title: "UI/UX Design", desc: "Beautiful interfaces your users will love" },
  { icon: "🌐", title: "Web Development", desc: "Fast, modern websites built to perform" },
  { icon: "📈", title: "SEO & Growth", desc: "Rank higher, reach further, grow faster" },
  { icon: "🎬", title: "Reels & Video", desc: "Scroll-stopping content for every platform" },
  { icon: "✨", title: "Brand Identity", desc: "Logos, guidelines, and brand strategy" },
];

const STATS = [
  { value: "150+", label: "Projects" },
  { value: "98%", label: "Satisfaction" },
  { value: "3+", label: "Years" },
  { value: "UAE", label: "Ajman FZ" },
];

// Free Unsplash image
const BG_IMAGE = "https://images.unsplash.com/photo-1603145733146-ae562a55031e?fm=jpg&q=80&w=1920&auto=format&fit=crop";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [activeService, setActiveService] = useState(0);
  const { signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setActiveService(p => (p + 1) % SERVICES.length), 2800);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(""); setLoading(true);
    try {
      await signIn(email, password);
      setCookie("am-crm-session", "true", { maxAge: 60 * 60 * 24 * 7 });
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#06101f" }}>

      {/* ===== LEFT — Photo + Content ===== */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Real photo background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        />
        {/* Dark overlay with navy tint */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,27,62,0.92) 0%, rgba(8,17,42,0.88) 50%, rgba(13,27,62,0.85) 100%)" }} />

        {/* Gold grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Corner decorations */}
        <div className="absolute top-8 left-8 w-14 h-14 border-l-2 border-t-2 opacity-40" style={{ borderColor: "#C9A84C" }} />
        <div className="absolute bottom-8 right-8 w-14 h-14 border-r-2 border-b-2 opacity-40" style={{ borderColor: "#C9A84C" }} />
        <div className="absolute top-8 right-8 w-8 h-8 border-r border-t opacity-20" style={{ borderColor: "#C9A84C" }} />
        <div className="absolute bottom-8 left-8 w-8 h-8 border-l border-b opacity-20" style={{ borderColor: "#C9A84C" }} />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))", border: "1px solid rgba(201,168,76,0.4)" }}>
              <span style={{ color: "#C9A84C", fontFamily: "var(--font-playfair)", fontSize: "11px", fontWeight: 700, letterSpacing: "-0.5px" }}>A&M</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">The A&M Internationals</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(201,168,76,0.65)" }}>FZC — Ajman, UAE</p>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="mb-3">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                ✦ Digital Agency
              </span>
            </div>

            <h1 className="mt-5 mb-4" style={{ fontFamily: "var(--font-playfair)", fontSize: "48px", fontWeight: 700, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
              Elevating the<br />
              <span style={{ color: "#C9A84C" }}>World,</span><br />
              Elegantly.
            </h1>

            <p className="text-sm mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 400 }}>
              We craft digital experiences that captivate audiences, build brands that inspire trust, and deliver results that matter.
            </p>

            {/* Animated service showcase */}
            <div className="mb-8 relative" style={{ height: 72 }}>
              {SERVICES.map((svc, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center gap-4 p-4 rounded-2xl transition-all duration-700"
                  style={{
                    opacity: i === activeService ? 1 : 0,
                    transform: i === activeService ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
                    background: i === activeService ? "rgba(201,168,76,0.08)" : "transparent",
                    border: i === activeService ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                    pointerEvents: i === activeService ? "auto" : "none",
                  }}
                >
                  <span className="text-3xl flex-shrink-0">{svc.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{svc.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{svc.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div className="flex gap-2 mb-12">
              {SERVICES.map((_, i) => (
                <button key={i} onClick={() => setActiveService(i)} className="transition-all duration-300 rounded-full" style={{ width: i === activeService ? 24 : 6, height: 6, background: i === activeService ? "#C9A84C" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="text-center p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
                  <p className="font-bold text-lg leading-tight" style={{ color: "#C9A84C" }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              © 2026 The A&M Internationals FZC · theaminternational.com
            </p>
          </div>
        </div>
      </div>

      {/* ===== RIGHT — Login Form ===== */}
      <div className="w-full lg:w-[460px] flex-shrink-0 flex items-center justify-center relative px-8 py-10" style={{ background: "#06101f" }}>

        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />
        </div>

        <div className="w-full max-w-[380px] relative" style={{ animation: mounted ? "fadeUp 0.6s ease forwards" : "none", opacity: 0 }}>

          {/* Gold accent line */}
          <div className="h-[2px] w-20 rounded-full mb-8" style={{ background: "linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.2), transparent)" }} />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.3)", animation: "pulse-gold 3s ease-in-out infinite" }}>
                <span style={{ color: "#C9A84C", fontFamily: "var(--font-playfair)", fontSize: "11px", fontWeight: 700, letterSpacing: "-0.5px" }}>A&M</span>
              </div>
              <div>
                <p className="font-bold text-white text-base" style={{ fontFamily: "var(--font-playfair)" }}>A&M CRM</p>
                <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(201,168,76,0.55)" }}>Internal Portal</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)", letterSpacing: "-0.02em" }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Sign in to your team account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Email Address</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@theaminternational.com"
                required
                className="w-full px-4 py-4 rounded-xl text-sm text-white outline-none transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(201,168,76,0.6)"; e.target.style.background = "rgba(201,168,76,0.05)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Password</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-4 py-4 rounded-xl text-sm text-white outline-none transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(201,168,76,0.6)"; e.target.style.background = "rgba(201,168,76,0.05)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              />
            </div>

            {error && (
              <div className="text-xs px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-sm relative overflow-hidden transition-all duration-200 mt-2"
              style={{ background: loading ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg, #C9A84C, #d4b360, #C9A84C)", color: "#0D1B3E", letterSpacing: "0.08em", backgroundSize: "200% auto" }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)", animation: "shimmer 2.5s infinite" }} />
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0D1B3E] border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : "SIGN IN →"}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              The A&M Internationals FZC — Internal Use Only
            </p>
            <p className="text-xs text-center mt-1" style={{ color: "rgba(201,168,76,0.35)" }}>
              Ajman Free Zone, UAE · theaminternational.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
