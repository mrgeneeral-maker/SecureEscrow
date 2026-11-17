import deploymentsJson from "../contracts/deployments.json";

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
  currencySymbol: string;
}

interface DeploymentEntry {
  address: string;
}

const deployments = deploymentsJson as Record<string, DeploymentEntry>;

export const CHAINS: ChainConfig[] = [
  {
    id: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    currencySymbol: "ETH",
  },
  {
    id: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    currencySymbol: "ETH",
  },
  {
    id: 31337,
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    currencySymbol: "ETH",
  },
];

export function getChain(chainId: number | null): ChainConfig | undefined {
  return CHAINS.find((chain) => chain.id === chainId);
}

export function getEscrowAddress(chainId: number | null): string | undefined {
  return chainId === null ? undefined : deployments[String(chainId)]?.address;
}

export function getDeployedChains(): ChainConfig[] {
  return CHAINS.filter((chain) => getEscrowAddress(chain.id) !== undefined);
}
