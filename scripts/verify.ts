import { network, run as hardhatRun } from "hardhat";
import { loadDeployment } from "./utils/deployments";
import { run } from "./utils/context";

async function main(): Promise<void> {
  const { address, constructorArgs } = loadDeployment(network.name);

  await hardhatRun("verify:verify", {
    address,
    constructorArguments: constructorArgs ?? [],
  });

  console.log(`SecureEscrow at ${address} verified on ${network.name}`);
}

run(main);
