"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/",          icon: "🏠", label: "Home"    },
  { href: "/redeem",    icon: "❤️", label: "Hadiya"  },
  { href: "/campaigns", icon: "🕌", label: "Majlis"  },
  { href: "/shura",     icon: "⚖️", label: "Shura"   },
  { href: "/dashboard", icon: "👤", label: "Profile" },
];

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  return (
    <nav style={{
      position: "sticky", bottom: 0, zIndex: 50,
      background: "#fff",
      borderTop: "0.5px solid rgba(0,0,0,0.06)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
    }}>
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, padding: "8px 0 4px",
            textDecoration: "none",
            color: active ? "#0A3A22" : "#9CA3AF",
            fontSize: 10, fontWeight: active ? 500 : 400,
            transition: "color .15s",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span>{t.label}</span>
            <span style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "#2D6A4F",
              opacity: active ? 1 : 0,
              transition: "opacity .15s",
            }} />
          </Link>
        );
      })}
    </nav>
  );
}
