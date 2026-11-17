import { getEscrowContext, requireEnvBigInt, run } from "../utils/context";

async function main(): Promise<void> {
  const { escrow, signer } = await getEscrowContext();
  const id = requireEnvBigInt("ESCROW_ID");

  const tx = await escrow.claimRefund(id);
  await tx.wait();

  console.log(`Escrow refund claimed for escrow ${id} by ${signer.address}`);
  console.log(`Tx hash: ${tx.hash}`);
}

run(main);
