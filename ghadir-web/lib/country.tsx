"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Country {
  code: string;
  name: string;
  region: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
  usd_fx_rate: number | null;
  default_locale: string | null;
}

// ISO alpha-2 → flag emoji (regional indicator letters)
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌐";
  const base = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

interface CountryCtx {
  country: string | null;        // selected ISO code (may be unlisted)
  current: Country | null;       // resolved meta for selected, if it's a live country
  countries: Country[];          // live countries (for the picker)
  setCountry: (code: string) => void;
}

const Ctx = createContext<CountryCtx | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountryState] = useState<string | null>(null);

  // Resolve initial selection: explicit choice (localStorage) > geo cookie
  useEffect(() => {
    const stored = localStorage.getItem("ghadir_country");
    const geo = readCookie("ghadir_country");
    setCountryState(stored || geo || null);
  }, []);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => setCountries(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const setCountry = useCallback((code: string) => {
    setCountryState(code);
    try { localStorage.setItem("ghadir_country", code); } catch {}
    document.cookie = `ghadir_country=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const current = countries.find((c) => c.code === country) ?? null;

  return <Ctx.Provider value={{ country, current, countries, setCountry }}>{children}</Ctx.Provider>;
}

export function useCountry() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
