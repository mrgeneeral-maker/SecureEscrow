import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployEscrowFixture, fundedEscrowFixture } from "../helpers/fixtures";
import { AMOUNT, AMOUNT_KOBO, DELIVERY_WINDOW, EscrowState } from "../helpers/constants";

describe("SecureEscrow: release", () => {
  it("pays the seller when the buyer releases", async () => {
    const { escrow, buyer, seller, escrowId } = await loadFixture(fundedEscrowFixture);
    const escrowAddress = await escrow.getAddress();

    await expect(escrow.connect(buyer).release(escrowId)).to.changeEtherBalances(
      [escrowAddress, seller],
      [-AMOUNT, AMOUNT],
    );
    expect((await escrow.getEscrow(escrowId)).state).to.equal(EscrowState.Released);
  });

  it("emits Released", async () => {
    const { escrow, buyer, seller, escrowId } = await loadFixture(fundedEscrowFixture);

    await expect(escrow.connect(buyer).release(escrowId))
      .to.emit(escrow, "Released")
      .withArgs(escrowId, seller.address, AMOUNT);
  });

  it("reverts when the seller tries to release", async () => {
    const { escrow, seller, escrowId } = await loadFixture(fundedEscrowFixture);

    await expect(escrow.connect(seller).release(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer",
    );
  });

  it("reverts when a stranger tries to release", async () => {
    const { escrow, stranger, escrowId } = await loadFixture(fundedEscrowFixture);

    await expect(escrow.connect(stranger).release(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer",
    );
  });

  it("reverts on a second release", async () => {
    const { escrow, buyer, escrowId } = await loadFixture(fundedEscrowFixture);

    await escrow.connect(buyer).release(escrowId);

    await expect(escrow.connect(buyer).release(escrowId))
      .to.be.revertedWithCustomError(escrow, "InvalidState")
      .withArgs(EscrowState.Released);
  });

  it("reverts for an escrow that does not exist", async () => {
    const { escrow, buyer } = await loadFixture(deployEscrowFixture);

    await expect(escrow.connect(buyer).release(99)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer",
    );
  });

  it("reverts and keeps the funds when the seller cannot receive Ether", async () => {
    const { escrow, buyer } = await loadFixture(deployEscrowFixture);
    const rejecter = await ethers.deployContract("EtherRejecter");

    await escrow
      .connect(buyer)
      .createEscrow(await rejecter.getAddress(), AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });

    await expect(escrow.connect(buyer).release(0)).to.be.revertedWithCustomError(
      escrow,
      "TransferFailed",
    );
    expect((await escrow.getEscrow(0)).state).to.equal(EscrowState.Funded);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(AMOUNT);
  });
});
