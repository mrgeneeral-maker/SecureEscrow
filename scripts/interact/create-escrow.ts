import { ethers } from "hardhat";
import { getEscrowContext, requireEnv, run } from "../utils/context";
import { toKobo } from "../utils/rate";

const BUFFER_BPS = 10_100n;

async function main(): Promise<void> {
  const { escrow, signer } = await getEscrowContext();
  const seller = requireEnv("SELLER");
  const amountKobo = toKobo(requireEnv("AMOUNT_NGN"));
  const deliveryWindow = BigInt(process.env.DELIVERY_WINDOW_SECONDS ?? "604800");

  const required: bigint = await escrow.quote(amountKobo);
  const tx = await escrow.createEscrow(seller, amountKobo, deliveryWindow, {
    value: (required * BUFFER_BPS) / 10_000n,
  });
  const receipt = await tx.wait();

  const log = receipt?.logs
    .map((entry) => escrow.interface.parseLog(entry))
    .find((parsed) => parsed?.name === "EscrowCreated");

  console.log(`Buyer:     ${signer.address}`);
  console.log(`Escrow id: ${log?.args.id}`);
  console.log(`Locked:    ${ethers.formatEther(log?.args.amountWei)} ETH`);
  console.log(`Deadline:  ${new Date(Number(log?.args.deadline) * 1000).toISOString()}`);
  console.log(`Tx hash:   ${tx.hash}`);
}

run(main);
