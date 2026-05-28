import { parseAbi } from "viem";

export const SALAWAT_TOKEN   = "0x9a751d39e1ebfb892e28bea8c0989cb28749fca3" as const;
export const SADAQAH_REDEMPTION = "0x7de0942a2582a918d93afed77e42dc3bc1e829eb" as const;

export const SALAWAT_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function lifetimeSalawat(address) view returns (uint256)",
  "function multiplier() view returns (uint256)",
  "function dailyCap() view returns (uint256)",
  "function dailyMinted(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function logSalawat(address user, uint256 count) external",
]);

export const REDEMPTION_ABI = parseAbi([
  "function redeemSadaqah(uint256 tokenAmount, address charity) external",
  "function TOKENS_PER_DOLLAR() view returns (uint256)",
]);

export const EXPLORER = "https://celo-sepolia.blockscout.com";
