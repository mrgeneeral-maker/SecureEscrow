import fs from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { run } from "../utils/context";

interface GasRow {
  function: string;
  gasUsed: number;
}

const KOBO_PER_ETH = 500_000_000n;
const AMOUNT_KOBO = 500_000_000n;
const AMOUNT = ethers.parseEther("1");
const WINDOW = 7 * 24 * 60 * 60;
const MAX_RATE_AGE = 24 * 60 * 60;

async function measure(label: string, pending: Promise<{ wait(): Promise<any> }>): Promise<GasRow> {
  const receipt = await (await pending).wait();
  return { function: label, gasUsed: Number(receipt.gasUsed) };
}

async function deployGas(contract: any): Promise<number> {
  const receipt = await contract.deploymentTransaction()?.wait();
  return Number(receipt?.gasUsed ?? 0);
}

async function main(): Promise<void> {
  const [deployer, buyer, seller] = await ethers.getSigners();

  const escrow = await ethers.deployContract("SecureEscrow", [
    deployer.address,
    KOBO_PER_ETH,
    MAX_RATE_AGE,
  ]);
  const secure: GasRow[] = [{ function: "deployment", gasUsed: await deployGas(escrow) }];

  secure.push(
    await measure(
      "createEscrow",
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, WINDOW, { value: AMOUNT }),
    ),
  );
  secure.push(await measure("release", escrow.connect(buyer).release(0)));

  await escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, WINDOW, { value: AMOUNT });
  secure.push(await measure("sellerRefund", escrow.connect(seller).sellerRefund(1)));

  await escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, WINDOW, { value: AMOUNT });
  await time.increase(WINDOW + 1);
  secure.push(await measure("claimRefund", escrow.connect(buyer).claimRefund(2)));

  secure.push(await measure("setRate", escrow.setRate((KOBO_PER_ETH * 101n) / 100n)));

  const baseline = await ethers.deployContract("VulnerableEscrow");
  const vulnerable: GasRow[] = [{ function: "deployment", gasUsed: await deployGas(baseline) }];

  vulnerable.push(
    await measure("createEscrow", baseline.connect(buyer).createEscrow(seller.address, { value: AMOUNT })),
  );
  vulnerable.push(await measure("release", baseline.connect(buyer).release(0)));

  console.log("SecureEscrow");
  console.table(secure);
  console.log("VulnerableEscrow");
  console.table(vulnerable);

  const reportsDir = path.resolve(__dirname, "..", "..", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "gas-comparison.json"),
    `${JSON.stringify({ secure, vulnerable }, null, 2)}\n`,
  );
  console.log(`Report written to ${reportsDir}`);
}

run(main);
