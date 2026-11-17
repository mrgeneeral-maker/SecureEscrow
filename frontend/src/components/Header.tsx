import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="header">
      <span className="logo">SecureEscrow</span>
      <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
    </header>
  );
}
