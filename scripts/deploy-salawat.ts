import { network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying SalawatToken...");

  const { viem } = await network.connect("celoSepolia");

  const [deployer] = await viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const publicClient = await viem.getPublicClient();
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log("Balance:", balance.toString(), "wei");

  const token = await viem.deployContract("SalawatToken");
  console.log("SalawatToken deployed to:", token.address);
  console.log(
    "Blockscout:",
    `https://celo-sepolia.blockscout.com/address/${token.address}`
  );

  const existing = fs.existsSync("deployments.json")
    ? JSON.parse(fs.readFileSync("deployments.json", "utf8"))
    : {};
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify({ ...existing, salawatToken: token.address }, null, 2)
  );
  console.log("Saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});