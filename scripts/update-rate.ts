import { ethers } from "hardhat";
import { getEscrowContext, run } from "./utils/context";
import { fetchEthNgn, stepToward, toKobo } from "./utils/rate";

async function updateOnce(): Promise<void> {
  const { escrow } = await getEscrowContext();

  const ngnPerEth = process.env.RATE_NGN_PER_ETH ?? (await fetchEthNgn());
  const target = toKobo(ngnPerEth);
  let current: bigint = await escrow.koboPerEth();

  do {
    const next = stepToward(current, target);
    await (await escrow.setRate(next)).wait();
    current = next;
  } while (current !== target);

  const naira = Number(ethers.formatUnits(target, 2));
  console.log(`${new Date().toISOString()} rate set to ₦${naira.toLocaleString("en-NG")} per ETH`);
}

async function main(): Promise<void> {
  const interval = Number(process.env.RATE_INTERVAL_SECONDS ?? "0");
  if (!interval) {
    await updateOnce();
    return;
  }

  for (;;) {
    try {
      await updateOnce();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

run(main);
