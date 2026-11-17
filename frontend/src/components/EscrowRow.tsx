import {
  EscrowState,
  formatDeadline,
  formatEth,
  formatNaira,
  shortAddress,
  type EscrowView,
} from "../lib/escrow";

export function statusText(e: EscrowView): string {
  switch (e.state) {
    case EscrowState.Funded:
      return e.role === "buyer"
        ? "Funds locked. Release once you receive the goods"
        : "Funds secured. Deliver, then the buyer releases";
    case EscrowState.Released:
      return "Paid to the seller";
    default:
      return "Returned to the buyer";
  }
}

export function EscrowRow({ escrow, onOpen }: { escrow: EscrowView; onOpen: (id: bigint) => void }) {
  const other = escrow.role === "buyer" ? escrow.seller : escrow.buyer;
  const funded = escrow.state === EscrowState.Funded;

  return (
    <button type="button" className={`row state-${EscrowState[escrow.state].toLowerCase()}`} onClick={() => onOpen(escrow.id)}>
      <span className="row-amount">
        {formatNaira(escrow.amountKobo)}
        <br />
        <small>{formatEth(escrow.amount)} ETH</small>
      </span>
      <span className="row-body">
        <strong>{escrow.role === "buyer" ? "To" : "From"} {shortAddress(other)}</strong>
        <span>{statusText(escrow)}</span>
      </span>
      <span className="row-meta">{funded ? formatDeadline(escrow.deadline) : `#${escrow.id}`}</span>
    </button>
  );
}
