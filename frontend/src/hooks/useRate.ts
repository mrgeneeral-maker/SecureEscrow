import { useCallback, useEffect, useState } from "react";
import type { BrowserProvider } from "ethers";
import { fetchRate, type Rate } from "../lib/escrow";

const REFRESH_MS = 60_000;

export function useRate(provider: BrowserProvider | null, contractAddress: string | undefined) {
  const [rate, setRate] = useState<Rate | null>(null);

  const refresh = useCallback(async () => {
    if (!provider || !contractAddress) {
      setRate(null);
      return;
    }
    try {
      setRate(await fetchRate(provider, contractAddress));
    } catch {
      setRate(null);
    }
  }, [provider, contractAddress]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { rate, refresh };
}
