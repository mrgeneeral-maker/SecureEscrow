import { ethers, network } from "hardhat";
import { saveDeployment } from "./utils/deployments";
import { run } from "./utils/context";
import { fetchEthNgn, toKobo } from "./utils/rate";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Set DEPLOYER_PRIVATE_KEY in .env");
  }

  const updater = process.env.RATE_UPDATER ?? deployer.address;
  const ngnPerEth = process.env.INITIAL_RATE_NGN_PER_ETH ?? (await fetchEthNgn());
  const initialRate = toKobo(ngnPerEth);
  const maxRateAge = BigInt(process.env.MAX_RATE_AGE_SECONDS ?? "86400");
  const constructorArgs = [updater, initialRate.toString(), maxRateAge.toString()];

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Updater:  ${updater}`);
  console.log(`Rate:     ${initialRate} kobo per ETH`);

  const escrow = await ethers.deployContract("SecureEscrow", constructorArgs);
  const deploymentTx = escrow.deploymentTransaction();
  await escrow.waitForDeployment();

  const receipt = await deploymentTx?.wait();
  const address = await escrow.getAddress();
  console.log(`SecureEscrow deployed to ${address}`);

  if (network.name === "hardhat") {
    return;
  }

  const file = saveDeployment(network.name, {
    contract: "SecureEscrow",
    address,
    deployer: deployer.address,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    txHash: deploymentTx?.hash ?? "",
    blockNumber: receipt?.blockNumber ?? 0,
    deployedAt: new Date().toISOString(),
    constructorArgs,
  });
  console.log(`Deployment record written to ${file}`);
}

run(main);
