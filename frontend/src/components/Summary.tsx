import { EscrowState, formatNaira, type EscrowView } from "../lib/escrow";

export const isOpen = (e: EscrowView) => e.state === EscrowState.Funded;

export const needsAction = (e: EscrowView) =>
  e.role === "buyer" && e.state === EscrowState.Funded && e.deadline * 1000 <= Date.now();

export function Summary({ escrows }: { escrows: EscrowView[] }) {
  const sum = (role: string) =>
    escrows
      .filter((e) => e.role === role && isOpen(e))
      .reduce((total, e) => total + e.amountKobo, 0n);

  return (
    <dl className="summary">
      <div className={escrows.some(needsAction) ? "alert" : ""}>
        <dt>Need your action</dt>
        <dd>{escrows.filter(needsAction).length}</dd>
      </div>
      <div>
        <dt>You have locked</dt>
        <dd>{formatNaira(sum("buyer"))}</dd>
      </div>
      <div>
        <dt>Coming to you</dt>
        <dd>{formatNaira(sum("seller"))}</dd>
      </div>
    </dl>
  );
}
