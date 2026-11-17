import { FormEvent, useEffect, useState } from "react";
import { isAddress } from "ethers";
import {
  formatEth,
  formatNaira,
  isRateFresh,
  parseNaira,
  quoteWei,
  type Rate,
} from "../lib/escrow";

interface Props {
  account: string;
  rate: Rate | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (seller: string, amountKobo: bigint, windowSeconds: bigint) => Promise<boolean>;
}

const PRESETS = [3, 7, 14, 30];

export function NewEscrowDialog({ account, rate, busy, onClose, onSubmit }: Props) {
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(7);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amountKobo = parseNaira(amount);
  const fresh = rate !== null && isRateFresh(rate);
  const ethNeeded = amountKobo && rate && fresh ? quoteWei(amountKobo, rate) : null;

  const sellerError = !seller
    ? "Paste the seller's wallet address."
    : !isAddress(seller)
      ? "That is not a valid address."
      : seller.toLowerCase() === account.toLowerCase()
        ? "You can't pay yourself."
        : null;
  const amountError = amountKobo === null ? "Enter an amount in naira, for example 25000." : null;
  const rateError = !rate
    ? "Loading the exchange rate…"
    : !fresh
      ? "The exchange rate is being refreshed. Try again shortly."
      : null;
  const valid = !sellerError && !amountError && !rateError;
  const deadline = new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid || amountKobo === null) return;
    if (await onSubmit(seller, amountKobo, BigInt(days) * 86_400n)) onClose();
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-label="New escrow" onSubmit={submit}>
        <header>
          <h2>New escrow</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <label>
          Who are you paying?
          <input autoFocus value={seller} onChange={(e) => setSeller(e.target.value.trim())} placeholder="Seller wallet address (0x…)" spellCheck={false} />
          {touched && sellerError && <small className="error">{sellerError}</small>}
        </label>

        <label>
          How much?
          <div className="amount-input">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
            <span>NGN</span>
          </div>
          {touched && amountError && <small className="error">{amountError}</small>}
          {ethNeeded !== null && <small className="hint">≈ {formatEth(ethNeeded)} ETH at ₦{formatNaira(rate!.koboPerEth).replace("₦", "")} per ETH</small>}
          {touched && rateError && <small className="error">{rateError}</small>}
        </label>

        <fieldset>
          <legend>Seller has to deliver within</legend>
          <div className="segments">
            {PRESETS.map((value) => (
              <button key={value} type="button" className={value === days ? "seg on" : "seg"} onClick={() => setDays(value)}>
                {value} days
              </button>
            ))}
          </div>
        </fieldset>

        <p className="terms">
          {amountKobo ? formatNaira(amountKobo) : "Your payment"} will be held by the contract in ETH.
          The seller gets it only when you release it. If nothing arrives by <strong>{deadline}</strong>,
          you can take it back. A small buffer is added to cover rate changes and the unused part is returned.
        </p>

        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Check your wallet…" : amountKobo ? `Lock ${formatNaira(amountKobo)}` : "Lock funds"}
        </button>
      </form>
    </div>
  );
}
