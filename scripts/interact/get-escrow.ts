import { ethers } from "hardhat";
import { getEscrowContext, requireEnvBigInt, run } from "../utils/context";

const STATES = ["None", "Funded", "Released", "Refunded"];

async function main(): Promise<void> {
  const { escrow } = await getEscrowContext();
  const id = requireEnvBigInt("ESCROW_ID");

  const data = await escrow.getEscrow(id);

  console.log({
    id: id.toString(),
    buyer: data.buyer,
    seller: data.seller,
    amountNgn: ethers.formatUnits(data.amountKobo, 2),
    lockedEth: ethers.formatEther(data.amount),
    deadline: new Date(Number(data.deadline) * 1000).toISOString(),
    state: STATES[Number(data.state)],
  });
}

run(main);
