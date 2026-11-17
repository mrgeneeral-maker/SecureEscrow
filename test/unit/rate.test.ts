import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployEscrowFixture } from "../helpers/fixtures";
import { KOBO_PER_ETH, MAX_RATE_AGE } from "../helpers/constants";

describe("SecureEscrow: exchange rate", () => {
  it("starts with the constructor values", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);

    expect(await escrow.koboPerEth()).to.equal(KOBO_PER_ETH);
    expect(await escrow.rateUpdater()).to.equal(updater.address);
    expect(await escrow.maxRateAge()).to.equal(MAX_RATE_AGE);
  });

  it("rejects invalid constructor arguments", async () => {
    const [, updater] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SecureEscrow");

    await expect(factory.deploy(ethers.ZeroAddress, KOBO_PER_ETH, MAX_RATE_AGE))
      .to.be.revertedWithCustomError(factory, "InvalidRateUpdater");
    await expect(factory.deploy(updater.address, 0, MAX_RATE_AGE))
      .to.be.revertedWithCustomError(factory, "InvalidRate");
    await expect(factory.deploy(updater.address, KOBO_PER_ETH, 0))
      .to.be.revertedWithCustomError(factory, "InvalidRateAge");
  });

  it("lets the updater change the rate and emits RateUpdated", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);
    const next = (KOBO_PER_ETH * 105n) / 100n;

    await expect(escrow.connect(updater).setRate(next))
      .to.emit(escrow, "RateUpdated")
      .withArgs(next);

    expect(await escrow.koboPerEth()).to.equal(next);
    expect(await escrow.rateUpdatedAt()).to.equal(await time.latest());
  });

  it("reverts when anyone else sets the rate", async () => {
    const { escrow, stranger, deployer } = await loadFixture(deployEscrowFixture);

    await expect(escrow.connect(stranger).setRate(KOBO_PER_ETH)).to.be.revertedWithCustomError(
      escrow,
      "NotRateUpdater",
    );
    await expect(escrow.connect(deployer).setRate(KOBO_PER_ETH)).to.be.revertedWithCustomError(
      escrow,
      "NotRateUpdater",
    );
  });

  it("reverts for a zero rate", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);

    await expect(escrow.connect(updater).setRate(0)).to.be.revertedWithCustomError(
      escrow,
      "InvalidRate",
    );
  });

  it("limits a single update to the maximum change", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);
    const max = (KOBO_PER_ETH * 11_000n) / 10_000n;
    const min = (KOBO_PER_ETH * 9_000n) / 10_000n;

    await expect(escrow.connect(updater).setRate(max + 1n))
      .to.be.revertedWithCustomError(escrow, "RateChangeTooLarge")
      .withArgs(min, max);
    await expect(escrow.connect(updater).setRate(min - 1n)).to.be.revertedWithCustomError(
      escrow,
      "RateChangeTooLarge",
    );
    await expect(escrow.connect(updater).setRate(max)).to.not.be.reverted;
  });

  it("refreshes a stale rate", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);

    await time.increase(MAX_RATE_AGE + 1);
    await expect(escrow.quote(1)).to.be.revertedWithCustomError(escrow, "StaleRate");

    await escrow.connect(updater).setRate(KOBO_PER_ETH);
    await expect(escrow.quote(1)).to.not.be.reverted;
  });

  it("changes the quote when the rate changes", async () => {
    const { escrow, updater } = await loadFixture(deployEscrowFixture);

    expect(await escrow.quote(KOBO_PER_ETH)).to.equal(ethers.parseEther("1"));
    await escrow.connect(updater).setRate((KOBO_PER_ETH * 110n) / 100n);

    expect(await escrow.quote(KOBO_PER_ETH)).to.be.lessThan(ethers.parseEther("1"));
  });

  it("lets only the owner replace the updater", async () => {
    const { escrow, deployer, stranger, updater } = await loadFixture(deployEscrowFixture);

    await expect(escrow.connect(stranger).setRateUpdater(stranger.address)).to.be.reverted;
    await expect(escrow.connect(deployer).setRateUpdater(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(escrow, "InvalidRateUpdater");

    await expect(escrow.connect(deployer).setRateUpdater(stranger.address))
      .to.emit(escrow, "RateUpdaterChanged")
      .withArgs(stranger.address);

    await expect(escrow.connect(updater).setRate(KOBO_PER_ETH)).to.be.revertedWithCustomError(
      escrow,
      "NotRateUpdater",
    );
    await expect(escrow.connect(stranger).setRate(KOBO_PER_ETH)).to.not.be.reverted;
  });

  it("keeps the locked ETH of existing escrows when the rate moves", async () => {
    const { escrow, updater, buyer, seller } = await loadFixture(deployEscrowFixture);
    const amount = ethers.parseEther("1");

    await escrow.connect(buyer).createEscrow(seller.address, KOBO_PER_ETH, 3600, { value: amount });
    await escrow.connect(updater).setRate((KOBO_PER_ETH * 110n) / 100n);

    expect((await escrow.getEscrow(0)).amount).to.equal(amount);
  });
});
