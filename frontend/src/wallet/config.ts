import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, trustWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { baseSepolia, hardhat } from "wagmi/chains";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "missing-project-id";

const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [rainbowWallet, metaMaskWallet, trustWallet, walletConnectWallet, injectedWallet] }],
  { appName: "SecureEscrow", projectId },
);

export const config = createConfig({
  connectors,
  chains: [baseSepolia, hardhat],
  transports: {
    [baseSepolia.id]: http("https://base-sepolia-rpc.publicnode.com"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
