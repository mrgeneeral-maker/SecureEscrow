import { ethers, network } from "hardhat";
import { loadDeployment } from "./deployments";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function requireEnvBigInt(name: string): bigint {
  const raw = requireEnv(name);
  try {
    return BigInt(raw);
  } catch {
    throw new Error(`Environment variable ${name} must be an integer, received "${raw}"`);
  }
}

export async function getEscrowContext() {
  const signers = await ethers.getSigners();
  const index = Number(process.env.SIGNER_INDEX ?? "0");
  const signer = signers[index];
  if (!signer) {
    throw new Error(`No signer available at SIGNER_INDEX=${index}`);
  }

  const deployment = loadDeployment(network.name);
  const escrow = await ethers.getContractAt("SecureEscrow", deployment.address, signer);

  return { escrow, signer, deployment };
}

export function run(main: () => Promise<void>): void {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
