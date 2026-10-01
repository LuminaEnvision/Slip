"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { robinhood } from "@/lib/chain";
import { walletConnect } from "./wallet-connect";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: [
    injected({ shimDisconnect: true, unstable_shimAsyncInject: 2_000 }),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            metadata: {
              name: "Slip",
              description: "USDG pay links on Robinhood Chain",
              url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [robinhood.id]: http(),
  },
  ssr: true,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
