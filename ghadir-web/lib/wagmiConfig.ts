"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celoSepolia } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Ghadir Waqf",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "placeholder",
  chains: [celoSepolia],
  ssr: true,
});
