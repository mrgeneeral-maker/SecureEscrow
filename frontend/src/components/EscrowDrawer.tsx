import { useEffect, useState } from "react";
import { EscrowState, formatEth, formatNaira, shortAddress, type EscrowView } from "../lib/escrow";
import { statusText } from "./EscrowRow";

export type EscrowAction = "release" | "sellerRefund" | "claimRefund";

interface Props {
  escrow: EscrowView;
  busy: boolean;
  explorerUrl?: string;
  onClose: () => void;
  onAction: (action: EscrowAction, id: bigint) => void;
}

interface Option {
  action: EscrowAction;
  label: string;
  note: string;
  primary?: boolean;
}

function options(e: EscrowView): Option[] {
  if (e.state !== EscrowState.Funded) return [];
  if (e.role === "seller")
    return [{ action: "sellerRefund", label: "Refund buyer", note: "Cancels the deal and returns the money to the buyer." }];
  const list: Option[] = [{ action: "release", label: "Release funds", primary: true, note: "Only do this once you have received what you paid for. It pays the seller and can't be undone." }];
  if (e.deadline * 1000 <= Date.now())
    list.push({ action: "claimRefund", label: "Claim refund", note: "The deadline has passed. Take your money back." });
  return list;
}

const STEPS = ["Locked", "Paid"];

export function EscrowDrawer({ escrow, busy, explorerUrl, onClose, onAction }: Props) {
  const [armed, setArmed] = useState<EscrowAction | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  };

  const step = escrow.state === EscrowState.Funded ? 0 : 1;
  const refunded = escrow.state === EscrowState.Refunded;
  const party = (label: string, address: string, you: boolean) => (
    <div className="party">
      <span>{label}{you && " (you)"}</span>
      <button type="button" className="link" onClick={() => copy(address)} title={address}>
        {copied === address ? "Copied" : shortAddress(address)}
      </button>
    </div>
  );

  return (
    <div className="overlay overlay-side" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Escrow ${escrow.id}`}>
        <header>
          <span>Escrow #{escrow.id.toString()}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="big">{formatNaira(escrow.amountKobo)}</p>
        <p className="hint">{formatEth(escrow.amount)} ETH locked at the rate when the escrow was created</p>
        <p className="status">{statusText(escrow)}</p>

        {refunded ? null : (
          <ol className="rail">
            {STEPS.map((label, i) => (
              <li key={label} className={escrow.state === EscrowState.Released || i < step ? "done" : i === step ? "now" : ""}>{label}</li>
            ))}
          </ol>
        )}

        <div className="parties">
          {party("Buyer", escrow.buyer, escrow.role === "buyer")}
          {party("Seller", escrow.seller, escrow.role === "seller")}
          <div className="party">
            <span>Deadline</span>
            <b>{new Date(escrow.deadline * 1000).toLocaleString()}</b>
          </div>
        </div>

        {options(escrow).map((opt) => (
          <div key={opt.action} className="option">
            <p>{opt.note}</p>
            {armed === opt.action ? (
              <div className="pair">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { setArmed(null); onAction(opt.action, escrow.id); }}>
                  Yes, {opt.label.toLowerCase()}
                </button>
                <button type="button" className="btn" onClick={() => setArmed(null)}>Cancel</button>
              </div>
            ) : (
              <button type="button" className={opt.primary ? "btn btn-primary" : "btn"} disabled={busy} onClick={() => setArmed(opt.action)}>
                {opt.label}
              </button>
            )}
          </div>
        ))}

        {explorerUrl && (
          <a className="link" href={explorerUrl} target="_blank" rel="noreferrer">View contract on explorer</a>
        )}
      </aside>
    </div>
  );
}
