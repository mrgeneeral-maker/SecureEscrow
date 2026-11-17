import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployEscrowFixture } from "../helpers/fixtures";
import {
  AMOUNT,
  AMOUNT_KOBO,
  DELIVERY_WINDOW,
  EscrowState,
  KOBO_PER_ETH,
} from "../helpers/constants";

describe("SecureEscrow: lifecycle", () => {
  it("completes the happy path: lock, release", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
    const escrowAddress = await escrow.getAddress();

    await expect(
      escrow
        .connect(buyer)
        .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT }),
    ).to.changeEtherBalances([buyer, escrowAddress], [-AMOUNT, AMOUNT]);

    await expect(escrow.connect(buyer).release(0)).to.changeEtherBalances(
      [escrowAddress, seller],
      [-AMOUNT, AMOUNT],
    );
    expect((await escrow.getEscrow(0)).state).to.equal(EscrowState.Released);
  });

  it("completes the failure path: lock, timeout, refund", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
    const escrowAddress = await escrow.getAddress();

    await escrow
      .connect(buyer)
      .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });
    await time.increase(DELIVERY_WINDOW + 1);

    await expect(escrow.connect(buyer).claimRefund(0)).to.changeEtherBalances(
      [escrowAddress, buyer],
      [-AMOUNT, AMOUNT],
    );
    expect((await escrow.getEscrow(0)).state).to.equal(EscrowState.Refunded);
  });

  it("keeps concurrent escrows independent", async () => {
    const { escrow, buyer, seller, victim } = await loadFixture(deployEscrowFixture);
    const escrowAddress = await escrow.getAddress();
    const second = ethers.parseEther("2");

    await escrow
      .connect(buyer)
      .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });
    await escrow
      .connect(victim)
      .createEscrow(seller.address, AMOUNT_KOBO * 2n, DELIVERY_WINDOW, { value: second });

    await escrow.connect(buyer).release(0);

    expect((await escrow.getEscrow(0)).state).to.equal(EscrowState.Released);
    expect((await escrow.getEscrow(1)).state).to.equal(EscrowState.Funded);
    expect(await ethers.provider.getBalance(escrowAddress)).to.equal(second);
  });

  it("pays out exactly the quoted amount for arbitrary naira values", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
    const amounts = [1n, 7n, 123_456n, 98_765_432_100n];

    for (const [index, kobo] of amounts.entries()) {
      const required = await escrow.quote(kobo);
      expect(required).to.be.gte((kobo * 10n ** 18n) / KOBO_PER_ETH);

      await escrow
        .connect(buyer)
        .createEscrow(seller.address, kobo, DELIVERY_WINDOW, { value: required });
      await expect(escrow.connect(buyer).release(index)).to.changeEtherBalance(seller, required);
    }

    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0);
  });
});
