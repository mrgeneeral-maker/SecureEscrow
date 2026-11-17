import { useCallback, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { getChain, getDeployedChains, getEscrowAddress } from "./config/chains";
import { Header } from "./components/Header";
import { Toast, type ToastMessage } from "./components/Toast";
import { Welcome } from "./components/Welcome";
import { Orders } from "./pages/Orders";

export default function App() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const contract = getEscrowAddress(chainId);
  const chain = getChain(chainId);
  const deployed = getDeployedChains();
  const notify = useCallback(
    (kind: ToastMessage["kind"], message: string, link?: string) => setToast({ kind, message, link }),
    [],
  );

  return (
    <div className="shell">
      <Header />

      <main className="page narrow">
        {!isConnected ? (
          <Welcome />
        ) : !contract ? (
          <div className="empty">
            <h3>Switch to a supported network</h3>
            <p>{deployed.length ? "SecureEscrow runs on:" : "No deployment found. Deploy, then run npm run export:frontend."}</p>
            <div className="pair">
              {deployed.map((c) => (
                <button key={c.id} type="button" className="btn btn-primary" onClick={() => switchChain({ chainId: c.id })}>
                  Switch to {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Orders contract={contract} explorerUrl={chain?.explorerUrl} onToast={notify} />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
