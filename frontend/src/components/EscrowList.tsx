import { useState } from "react";
import { EscrowState, type EscrowView, type Role } from "../lib/escrow";
import { EscrowRow } from "./EscrowRow";
import { isOpen, needsAction } from "./Summary";

interface Props {
  escrows: EscrowView[];
  loading: boolean;
  error: string | null;
  onOpen: (id: bigint) => void;
  onRefresh: () => void;
}

const FILTERS: [Role | "all", string][] = [["all", "All"], ["buyer", "Buying"], ["seller", "Selling"]];

export function EscrowList({ escrows, loading, error, onOpen, onRefresh }: Props) {
  const [filter, setFilter] = useState<Role | "all">("all");
  const shown = escrows.filter((e) => filter === "all" || e.role === filter);
  const groups: [string, EscrowView[]][] = [
    ["Needs your action", shown.filter(needsAction)],
    ["In progress", shown.filter((e) => isOpen(e) && !needsAction(e))],
    ["Finished", shown.filter((e) => e.state === EscrowState.Released || e.state === EscrowState.Refunded)],
  ];

  return (
    <section>
      <div className="list-head">
        <div className="segments">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "seg on" : "seg"} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="link" onClick={onRefresh} disabled={loading}>
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {!loading && shown.length === 0 && (
        <div className="empty">
          <h3>No escrows yet</h3>
          <p>Create an escrow and the payment is held safely until you release it.</p>
        </div>
      )}

      {groups.map(([title, items]) =>
        items.length > 0 ? (
          <div key={title} className="group">
            <h3>{title} <span>{items.length}</span></h3>
            {items.map((e) => <EscrowRow key={e.id.toString()} escrow={e} onOpen={onOpen} />)}
          </div>
        ) : null,
      )}
    </section>
  );
}
