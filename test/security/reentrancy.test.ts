import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployEscrowFixture } from "../helpers/fixtures";
import { AMOUNT, AMOUNT_KOBO, DELIVERY_WINDOW, EscrowState } from "../helpers/constants";

describe("Reentrancy (SWC-107)", () => {
  const victimDeposit = ethers.parseEther("5");

  describe("VulnerableEscrow", () => {
    it("is drained by a reentrant release", async () => {
      const [, victimBuyer, honestSeller] = await ethers.getSigners();
      const vulnerable = await ethers.deployContract("VulnerableEscrow");
      const attacker = await ethers.deployContract("ReentrancyAttacker", [
        await vulnerable.getAddress(),
      ]);

      await vulnerable.connect(victimBuyer).createEscrow(honestSeller.address, {
        value: victimDeposit,
      });

      await attacker.attack({ value: AMOUNT });

      expect(await ethers.provider.getBalance(await vulnerable.getAddress())).to.equal(0);
      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(
        victimDeposit + AMOUNT,
      );
    });
  });

  describe("SecureEscrow", () => {
    it("blocks reentry into claimRefund and preserves other users' funds", async () => {
      const { escrow, seller, victim } = await loadFixture(deployEscrowFixture);
      const escrowAddress = await escrow.getAddress();
      const attacker = await ethers.deployContract("ReentrantBuyer", [escrowAddress]);
      const attackerAddress = await attacker.getAddress();

      await escrow
        .connect(victim)
        .createEscrow(seller.address, AMOUNT_KOBO * 5n, DELIVERY_WINDOW, { value: victimDeposit });
      await attacker.open(seller.address, AMOUNT_KOBO, DELIVERY_WINDOW, { value: AMOUNT });
      await time.increase(DELIVERY_WINDOW + 1);

      await attacker.claim();

      expect(await attacker.attempted()).to.equal(true);
      expect(await attacker.reentered()).to.equal(false);
      expect(await ethers.provider.getBalance(attackerAddress)).to.equal(AMOUNT);
      expect(await ethers.provider.getBalance(escrowAddress)).to.equal(victimDeposit);
      expect((await escrow.getEscrow(0)).state).to.equal(EscrowState.Funded);
      expect((await escrow.getEscrow(1)).state).to.equal(EscrowState.Refunded);
    });
  });
});
