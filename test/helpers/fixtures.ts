import { ethers } from "hardhat";
import { AMOUNT, AMOUNT_KOBO, DELIVERY_WINDOW, KOBO_PER_ETH, MAX_RATE_AGE } from "./constants";

export async function deployEscrowFixture() {
  const [deployer, buyer, seller, stranger, victim, updater] = await ethers.getSigners();
  const escrow = await ethers.deployContract("SecureEscrow", [
    updater.address,
    KOBO_PER_ETH,
    MAX_RATE_AGE,
  ]);
  await escrow.waitForDeployment();

  return { escrow, deployer, buyer, seller, stranger, victim, updater };
}

export async function fundedEscrowFixture() {
  const base = await deployEscrowFixture();
  const escrowId = 0n;

  await base.escrow
    .connect(base.buyer)
    .createEscrow(base.seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });

  return { ...base, escrowId };
}
