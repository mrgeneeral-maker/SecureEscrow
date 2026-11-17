import fs from "node:fs";
import path from "node:path";

export interface DeploymentRecord {
  contract: string;
  address: string;
  deployer: string;
  chainId: number;
  txHash: string;
  blockNumber: number;
  deployedAt: string;
  constructorArgs?: string[];
}

const DEPLOYMENTS_DIR = path.resolve(__dirname, "..", "..", "deployments");

function deploymentPath(networkName: string): string {
  return path.join(DEPLOYMENTS_DIR, `${networkName}.json`);
}

export function saveDeployment(networkName: string, record: DeploymentRecord): string {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const file = deploymentPath(networkName);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

export function loadDeployment(networkName: string): DeploymentRecord {
  const file = deploymentPath(networkName);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No deployment found for network "${networkName}". Run the deploy script first.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as DeploymentRecord;
}
