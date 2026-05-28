import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { celoSepolia } from "./chain";

export const wagmiConfig = createConfig({
  chains: [celoSepolia],
  transports: {
    [celoSepolia.id]: http(),
  },
});
