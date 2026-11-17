import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { EscrowDrawer, type EscrowAction } from "../components/EscrowDrawer";
import { EscrowList } from "../components/EscrowList";
import { NewEscrowDialog } from "../components/NewEscrowDialog";
import { Summary } from "../components/Summary";
import { useEscrows } from "../hooks/useEscrows";
import { useEthersProvider } from "../hooks/useEthersProvider";
import { useRate } from "../hooks/useRate";
import { getWriteContract, parseTxError, quoteWei, withBuffer } from "../lib/escrow";

interface Props {
  contract: string;
  explorerUrl?: string;
  onToast: (kind: "info" | "success" | "error", message: string, link?: string) => void;
}

const LABELS: Record<EscrowAction, string> = {
  release: "Release funds",
  sellerRefund: "Refund buyer",
  claimRefund: "Claim refund",
};

export function Orders({ contract, explorerUrl, onToast }: Props) {
  const { address } = useAccount();
  const provider = useEthersProvider();
  const { escrows, loading, error, refresh } = useEscrows(provider, contract, address ?? null);
  const { rate, refresh: refreshRate } = useRate(provider, contract);
  const [openId, setOpenId] = useState<bigint | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = escrows.find((e) => e.id === openId);

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const txLink = (hash: string) => (explorerUrl ? `${explorerUrl}/tx/${hash}` : undefined);

  const run = useCallback(
    async (action: EscrowAction, id: bigint) => {
      if (!provider) return;
      setBusy(true);
      onToast("info", `${LABELS[action]}: confirm in your wallet…`);
      try {
        const tx = await (await getWriteContract(provider, contract))[action](id);
        onToast("info", `${LABELS[action]}: waiting for the network…`);
        await tx.wait();
        onToast("success", `${LABELS[action]}: done.`, txLink(tx.hash));
        await refresh();
      } catch (err) {
        onToast("error", parseTxError(err));
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, contract, explorerUrl, onToast, refresh],
  );

  const create = useCallback(
    async (seller: string, amountKobo: bigint, windowSeconds: bigint) => {
      if (!provider) return false;
      setBusy(true);
      try {
        await refreshRate();
        const writer = await getWriteContract(provider, contract);
        const required = quoteWei(amountKobo, rate!);
        onToast("info", "Confirm the escrow in your wallet…");
        const tx = await writer.createEscrow(seller, amountKobo, windowSeconds, {
          value: withBuffer(required),
        });
        onToast("info", "Locking your payment in escrow…");
        await tx.wait();
        onToast("success", "Payment locked. Release it when the goods arrive.", txLink(tx.hash));
        await refresh();
        return true;
      } catch (err) {
        onToast("error", parseTxError(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, contract, rate, explorerUrl, onToast, refresh, refreshRate],
  );

  return (
    <main className="page narrow">
      <div className="page-head">
        <h1 className="page-title">My escrows</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>New escrow</button>
      </div>

      <Summary escrows={escrows} />
      <EscrowList escrows={escrows} loading={loading} error={error} onOpen={setOpenId} onRefresh={refresh} />

      {selected && (
        <EscrowDrawer
          escrow={selected}
          busy={busy}
          explorerUrl={explorerUrl ? `${explorerUrl}/address/${contract}` : undefined}
          onClose={() => setOpenId(null)}
          onAction={(action, id) => void run(action, id)}
        />
      )}

      {creating && address && (
        <NewEscrowDialog account={address} rate={rate} busy={busy} onClose={() => setCreating(false)} onSubmit={create} />
      )}
    </main>
  );
}
