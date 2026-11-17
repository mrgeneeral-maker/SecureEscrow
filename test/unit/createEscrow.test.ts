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
  MAX_DELIVERY_WINDOW,
  MAX_RATE_AGE,
} from "../helpers/constants";

describe("SecureEscrow: createEscrow", () => {
  it("locks the ETH equivalent of the Naira amount", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
    const escrowAddress = await escrow.getAddress();

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, {
        value: AMOUNT,
      }),
    ).to.changeEtherBalances([buyer, escrowAddress], [-AMOUNT, AMOUNT]);

    const stored = await escrow.getEscrow(0);
    expect(stored.buyer).to.equal(buyer.address);
    expect(stored.seller).to.equal(seller.address);
    expect(stored.amount).to.equal(AMOUNT);
    expect(stored.amountKobo).to.equal(AMOUNT_KOBO);
    expect(stored.state).to.equal(EscrowState.Funded);
  });

  it("emits EscrowCreated with the naira and wei amounts", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    const tx = escrow
      .connect(buyer)
      .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });
    const deadline = (await time.latest()) + 1 + DELIVERY_WINDOW;

    await expect(tx)
      .to.emit(escrow, "EscrowCreated")
      .withArgs(0, buyer.address, seller.address, AMOUNT_KOBO, AMOUNT, deadline);
  });

  it("assigns sequential identifiers", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await escrow
      .connect(buyer)
      .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });
    await escrow
      .connect(buyer)
      .createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });

    expect(await escrow.escrowCount()).to.equal(2);
  });

  it("returns value sent above the quote", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
    const escrowAddress = await escrow.getAddress();
    const sent = AMOUNT + ethers.parseEther("0.5");

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, {
        value: sent,
      }),
    ).to.changeEtherBalances([buyer, escrowAddress], [-AMOUNT, AMOUNT]);
  });

  it("rounds the required ETH up so the seller is never underpaid", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);

    await escrow.connect(updater).setRate((KOBO_PER_ETH * 105n) / 100n);

    expect(await escrow.quote(1)).to.equal(1_904_761_905n);
  });

  it("reverts when the payment is below the quote", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, {
        value: AMOUNT - 1n,
      }),
    )
      .to.be.revertedWithCustomError(escrow, "Underfunded")
      .withArgs(AMOUNT);
  });

  it("reverts when the naira amount is zero", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, 0, DELIVERY_WINDOW, { value: AMOUNT }),
    ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
  });

  it("reverts for a zero-address seller", async () => {
    const { escrow, buyer } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow
        .connect(buyer)
        .createEscrow(ethers.ZeroAddress, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT }),
    ).to.be.revertedWithCustomError(escrow, "InvalidSeller");
  });

  it("reverts when the buyer names themselves as seller", async () => {
    const { escrow, buyer } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow
        .connect(buyer)
        .createEscrow(buyer.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT }),
    ).to.be.revertedWithCustomError(escrow, "InvalidSeller");
  });

  it("reverts for a zero delivery window", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, 0, { value: AMOUNT }),
    ).to.be.revertedWithCustomError(escrow, "InvalidDeliveryWindow");
  });

  it("accepts the maximum window and rejects anything above it", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow
        .connect(buyer)
        .createEscrow(seller.address, AMOUNT_KOBO, MAX_DELIVERY_WINDOW, { value: AMOUNT }),
    ).to.not.be.reverted;
    await expect(
      escrow
        .connect(buyer)
        .createEscrow(seller.address, AMOUNT_KOBO, MAX_DELIVERY_WINDOW + 1, { value: AMOUNT }),
    ).to.be.revertedWithCustomError(escrow, "InvalidDeliveryWindow");
  });

  it("reverts when the rate has gone stale", async () => {
    const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);

    await time.increase(MAX_RATE_AGE + 1);

    await expect(
      escrow.connect(buyer).createEscrow(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, {
        value: AMOUNT,
      }),
    ).to.be.revertedWithCustomError(escrow, "StaleRate");
  });

  it("rejects plain Ether transfers", async () => {
    const { escrow, buyer } = await loadFixture(deployEscrowFixture);

    await expect(
      buyer.sendTransaction({ to: await escrow.getAddress(), value: 1n }),
    ).to.be.reverted;
  });
});
