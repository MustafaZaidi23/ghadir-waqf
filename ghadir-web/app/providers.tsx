"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmiConfig";
import { celoSepolia } from "@/lib/chain";
import { useEffect } from "react";
import { getTelegramWebApp } from "@/lib/telegram";
import { LanguageProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

function TelegramInit() {
  useEffect(() => {
    const twa = getTelegramWebApp();
    if (twa) {
      twa.ready();
      twa.expand();
      // Match the Mini App chrome to the brand (Ghadir Green) for a native feel
      twa.setHeaderColor?.("#0A3D2E");
      twa.setBackgroundColor?.("#071f17");
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        defaultChain: celoSepolia,
        supportedChains: [celoSepolia],
        appearance: {
          theme: "dark",
          accentColor: "#22c55e",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <TelegramInit />
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
