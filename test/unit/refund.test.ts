import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { fundedEscrowFixture } from "../helpers/fixtures";
import { AMOUNT, DELIVERY_WINDOW, EscrowState } from "../helpers/constants";

describe("SecureEscrow: sellerRefund", () => {
  it("returns the funds to the buyer and marks the escrow Refunded", async () => {
    const { escrow, buyer, seller, escrowId } = await loadFixture(fundedEscrowFixture);
    const escrowAddress = await escrow.getAddress();

    await expect(escrow.connect(seller).sellerRefund(escrowId)).to.changeEtherBalances(
      [escrowAddress, buyer],
      [-AMOUNT, AMOUNT],
    );

    expect((await escrow.getEscrow(escrowId)).state).to.equal(EscrowState.Refunded);
  });

  it("emits Refunded", async () => {
    const { escrow, buyer, seller, escrowId } = await loadFixture(fundedEscrowFixture);

    await expect(escrow.connect(seller).sellerRefund(escrowId))
      .to.emit(escrow, "Refunded")
      .withArgs(escrowId, buyer.address, AMOUNT);
  });

  it("reverts for anyone other than the seller", async () => {
    const { escrow, buyer, stranger, escrowId } = await loadFixture(fundedEscrowFixture);

    await expect(escrow.connect(buyer).sellerRefund(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotSeller",
    );
    await expect(escrow.connect(stranger).sellerRefund(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotSeller",
    );
  });

  it("reverts once the funds have been released", async () => {
    const { escrow, buyer, seller, escrowId } = await loadFixture(fundedEscrowFixture);
    await escrow.connect(buyer).release(escrowId);

    await expect(escrow.connect(seller).sellerRefund(escrowId))
      .to.be.revertedWithCustomError(escrow, "InvalidState")
      .withArgs(EscrowState.Released);
  });

  it("reverts on a second refund", async () => {
    const { escrow, seller, escrowId } = await loadFixture(fundedEscrowFixture);
    await escrow.connect(seller).sellerRefund(escrowId);

    await expect(escrow.connect(seller).sellerRefund(escrowId))
      .to.be.revertedWithCustomError(escrow, "InvalidState")
      .withArgs(EscrowState.Refunded);
  });
});

describe("SecureEscrow: claimRefund", () => {
  it("returns the funds to the buyer after the deadline", async () => {
    const { escrow, buyer, escrowId } = await loadFixture(fundedEscrowFixture);
    const escrowAddress = await escrow.getAddress();
    await time.increase(DELIVERY_WINDOW + 1);

    await expect(escrow.connect(buyer).claimRefund(escrowId)).to.changeEtherBalances(
      [escrowAddress, buyer],
      [-AMOUNT, AMOUNT],
    );

    expect((await escrow.getEscrow(escrowId)).state).to.equal(EscrowState.Refunded);
  });

  it("emits Refunded", async () => {
    const { escrow, buyer, escrowId } = await loadFixture(fundedEscrowFixture);
    await time.increase(DELIVERY_WINDOW + 1);

    await expect(escrow.connect(buyer).claimRefund(escrowId))
      .to.emit(escrow, "Refunded")
      .withArgs(escrowId, buyer.address, AMOUNT);
  });

  it("reverts before the deadline", async () => {
    const { escrow, buyer, escrowId } = await loadFixture(fundedEscrowFixture);
    const { deadline } = await escrow.getEscrow(escrowId);

    await expect(escrow.connect(buyer).claimRefund(escrowId))
      .to.be.revertedWithCustomError(escrow, "DeadlineNotReached")
      .withArgs(deadline);
  });

  it("reverts for anyone other than the buyer", async () => {
    const { escrow, seller, stranger, escrowId } = await loadFixture(fundedEscrowFixture);
    await time.increase(DELIVERY_WINDOW + 1);

    await expect(escrow.connect(seller).claimRefund(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer",
    );
    await expect(escrow.connect(stranger).claimRefund(escrowId)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer",
    );
  });

  it("reverts after the funds were released", async () => {
    const { escrow, buyer, escrowId } = await loadFixture(fundedEscrowFixture);
    await escrow.connect(buyer).release(escrowId);
    await time.increase(DELIVERY_WINDOW + 1);

    await expect(escrow.connect(buyer).claimRefund(escrowId))
      .to.be.revertedWithCustomError(escrow, "InvalidState")
      .withArgs(EscrowState.Released);
  });
});
