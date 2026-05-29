"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

const SUPER_ADMIN = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

const NAV_ITEMS = [
  { href: "/",            icon: "🏠", key: "home"        },
  { href: "/dashboard",   icon: "👤", key: "profile"     },
  { href: "/redeem",      icon: "❤️", key: "hadiya"      },
  { href: "/campaigns",   icon: "🕌", key: "campaigns"   },
  { href: "/leaderboard", icon: "🏅", key: "leaderboard" },
];

export function Nav() {
  const path                    = usePathname();
  const { t }                   = useLanguage();
  const { login, logout, authenticated, ready } = usePrivy();
  const { address, isConnected } = useAccount();
  const [open, setOpen]         = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const menuRef                 = useRef<HTMLDivElement>(null);

  // Admin access check
  useEffect(() => {
    if (!isConnected || !address) { setIsAdmin(false); return; }
    if (address.toLowerCase() === SUPER_ADMIN) { setIsAdmin(true); return; }
    fetch(`/api/my-role?wallet=${address}`)
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.role))
      .catch(() => setIsAdmin(false));
  }, [address, isConnected]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [path]);

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ href: "/admin", icon: "⚙️", key: "admin" }] : []),
  ];

  const isActive = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <div ref={menuRef} className="sticky top-0 z-50">
      {/* ── Top bar ── */}
      <nav className="h-14 flex items-center px-4" style={{ background: "var(--ghadir-green)", borderBottom: "1px solid rgba(212,175,55,0.18)" }}>
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 17, color: "#D4AF37", letterSpacing: "0.05em" }}>GHADIR</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 11, color: "rgba(212,175,55,0.55)", letterSpacing: "0.18em", textTransform: "uppercase" }}>WAQF</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-5 mx-6 flex-1 justify-center">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                style={{
                  fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: isActive(item.href) ? 600 : 400,
                  color: isActive(item.href) ? "#D4AF37" : "rgba(255,255,255,0.65)",
                  textDecoration: "none", transition: "color .15s",
                  borderBottom: isActive(item.href) ? "2px solid #D4AF37" : "2px solid transparent",
                  paddingBottom: 2,
                }}>
                {t(item.key)}
              </Link>
            ))}
          </div>

          {/* Right side: wallet + three-dot */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Wallet button */}
            {!ready ? (
              <div className="w-20 h-7 bg-[#1e3a1e] rounded-lg animate-pulse" />
            ) : authenticated && address ? (
              <span className="text-[#6b9e6b] text-xs font-mono hidden sm:block">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            ) : (
              <button onClick={login} className="btn-primary text-xs px-3 py-1.5 hidden sm:flex">
                {t("sign_in")}
              </button>
            )}

            {/* Three-dot button — always visible */}
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
              style={{
                width: 36, height: 36, borderRadius: 9,
                background: open ? "#0d2b16" : "transparent",
                border: `1px solid ${open ? "#22c55e40" : "#1e3a1e"}`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, cursor: "pointer", transition: "all .15s", flexShrink: 0,
              }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: open ? "#22c55e" : "#6b9e6b",
                  transition: "background .15s",
                }} />
              ))}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Dropdown menu ── */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "var(--ghadir-green)",
          borderBottom: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          animation: "slideDown .18s ease",
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "8px 16px 12px" }}>

            {/* Nav links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
              {navItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 12px", borderRadius: 10, textDecoration: "none",
                      background: active ? "rgba(212,175,55,0.12)" : "transparent",
                      border: `1px solid ${active ? "rgba(212,175,55,0.3)" : "transparent"}`,
                      transition: "background .12s",
                    }}>
                    <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{item.icon}</span>
                    <span style={{
                      fontSize: 13, fontFamily: "'Inter', sans-serif",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#D4AF37" : "rgba(255,255,255,0.55)",
                    }}>
                      {t(item.key)}
                    </span>
                    {active && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />}
                  </Link>
                );
              })}
            </div>

            {/* Divider + auth */}
            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {address ? (
                <>
                  <span style={{ fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    {address.slice(0, 8)}…{address.slice(-6)}
                  </span>
                  <button onClick={() => { logout(); setOpen(false); }}
                    style={{ fontSize: 12, color: "#f87171", background: "#7f1d1d20", border: "1px solid #7f1d1d40", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                    {t("sign_out")}
                  </button>
                </>
              ) : (
                <button onClick={() => { login(); setOpen(false); }}
                  className="btn-primary w-full" style={{ fontSize: 13, justifyContent: "center" }}>
                  {t("sign_in")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
