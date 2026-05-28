import { network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying GhadirNFT...");

  const conn = await network.connect("celoSepolia");
  const { viem } = conn;

  const [deployer] = await viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const nft = await viem.deployContract("GhadirNFT");

  console.log("GhadirNFT deployed to:", nft.address);
  console.log(
    "Blockscout:",
    `https://celo-sepolia.blockscout.com/address/${nft.address}`
  );

  const existing = fs.existsSync("deployments.json")
    ? JSON.parse(fs.readFileSync("deployments.json", "utf8"))
    : {};
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify({ ...existing, ghadirNFT: nft.address }, null, 2)
  );
  console.log("Saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
