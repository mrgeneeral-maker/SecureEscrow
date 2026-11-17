import { useCallback, useEffect, useState } from "react";
import type { BrowserProvider } from "ethers";
import { fetchUserEscrows, parseTxError, type EscrowView } from "../lib/escrow";

export function useEscrows(
  provider: BrowserProvider | null,
  contractAddress: string | undefined,
  account: string | null,
) {
  const [escrows, setEscrows] = useState<EscrowView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!provider || !contractAddress || !account) {
      setEscrows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setEscrows(await fetchUserEscrows(provider, contractAddress, account));
    } catch (err) {
      setError(parseTxError(err));
    } finally {
      setLoading(false);
    }
  }, [provider, contractAddress, account]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { escrows, loading, error, refresh };
}
