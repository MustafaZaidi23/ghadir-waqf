import { network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying HadiyaRedemption...");

  const conn = await network.connect("celoSepolia");
  const { viem } = conn;

  const [deployer] = await viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const deployments = fs.existsSync("deployments.json")
    ? JSON.parse(fs.readFileSync("deployments.json", "utf8"))
    : {};

  const salawatTokenAddress = deployments.salawatToken as `0x${string}` | undefined;
  const waqfTreasuryAddress = deployments.waqfTreasury as `0x${string}` | undefined;

  if (!salawatTokenAddress) throw new Error("salawatToken not found in deployments.json — deploy it first");
  if (!waqfTreasuryAddress) throw new Error("waqfTreasury not found in deployments.json — deploy it first");

  console.log("SalawatToken:", salawatTokenAddress);
  console.log("WaqfTreasury:", waqfTreasuryAddress);

  const redemption = await viem.deployContract("HadiyaRedemption", [
    salawatTokenAddress,
    waqfTreasuryAddress,
  ]);

  console.log("HadiyaRedemption deployed to:", redemption.address);
  console.log(
    "Blockscout:",
    `https://celo-sepolia.blockscout.com/address/${redemption.address}`
  );

  // Wire up: grant HadiyaRedemption HADIYA_CALLER_ROLE on WaqfTreasury
  // so it can call releaseHadiya() — deliberately NOT DEFAULT_ADMIN_ROLE
  console.log("\nGranting HADIYA_CALLER_ROLE on WaqfTreasury to HadiyaRedemption...");
  const publicClient = await viem.getPublicClient();
  const waqfTreasury = await viem.getContractAt("WaqfTreasury", waqfTreasuryAddress);
  const HADIYA_CALLER_ROLE = await waqfTreasury.read.HADIYA_CALLER_ROLE();
  const grantHash = await waqfTreasury.write.grantRole([HADIYA_CALLER_ROLE, redemption.address]);
  await publicClient.waitForTransactionReceipt({ hash: grantHash });
  console.log("Role granted.");

  // Wire up: allow HadiyaRedemption as a recipient on SalawatToken
  console.log("Setting HadiyaRedemption as allowedRecipient on SalawatToken...");
  const salawatToken = await viem.getContractAt("SalawatToken", salawatTokenAddress);
  const allowHash = await salawatToken.write.setAllowedRecipient([redemption.address, true]);
  await publicClient.waitForTransactionReceipt({ hash: allowHash });
  console.log("AllowedRecipient set.");

  fs.writeFileSync(
    "deployments.json",
    JSON.stringify({ ...deployments, hadiyaRedemption: redemption.address }, null, 2)
  );
  console.log("\nSaved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
