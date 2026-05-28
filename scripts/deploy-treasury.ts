import { network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying WaqfTreasury...");

  const conn = await network.connect("celoSepolia");
  const { viem } = conn;

  const [deployer] = await viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  console.log("Deployer:", deployerAddress);

  // USDC on Celo Sepolia — set USDC_ADDRESS in .env to override
  const usdcAddress: `0x${string}` =
    (process.env.USDC_ADDRESS as `0x${string}`) ??
    "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"; // Celo Sepolia USDC (Circle testnet)

  // For testnet: deployer address fills all trustee + scholar slots
  const trustees: `0x${string}`[] = [deployerAddress, deployerAddress, deployerAddress];
  const scholar: `0x${string}` = deployerAddress;

  console.log("USDC:", usdcAddress);
  console.log("Trustees:", trustees);
  console.log("Scholar:", scholar);

  const treasury = await viem.deployContract("WaqfTreasury", [
    usdcAddress,
    trustees,
    scholar,
  ]);

  console.log("WaqfTreasury deployed to:", treasury.address);
  console.log(
    "Blockscout:",
    `https://celo-sepolia.blockscout.com/address/${treasury.address}`
  );

  const existing = fs.existsSync("deployments.json")
    ? JSON.parse(fs.readFileSync("deployments.json", "utf8"))
    : {};
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify({ ...existing, waqfTreasury: treasury.address }, null, 2)
  );
  console.log("Saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
