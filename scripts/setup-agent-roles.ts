import "dotenv/config";
import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";

async function main() {
  const conn = await network.connect("celoSepolia");
  const { viem } = conn;

  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const agentAddress = privateKeyToAccount(
    `0x${process.env.AGENT_PRIVATE_KEY!.replace("0x", "")}` as `0x${string}`
  ).address;

  console.log("Deployer:", deployer.account.address);
  console.log("Agent:   ", agentAddress);

  const { salawatToken } = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  const token = await viem.getContractAt("SalawatToken", salawatToken);

  const MINTER_ROLE = await token.read.MINTER_ROLE();

  const hasMinterRole = await token.read.hasRole([MINTER_ROLE, agentAddress]);
  if (hasMinterRole) {
    console.log("Agent already has MINTER_ROLE — nothing to do.");
    return;
  }

  console.log("Granting MINTER_ROLE to agent…");
  const txHash = await token.write.grantRole([MINTER_ROLE, agentAddress]);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`Done. MINTER_ROLE granted to: ${agentAddress}`);
  console.log(`Tx: https://celo-sepolia.blockscout.com/tx/${txHash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
