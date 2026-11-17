import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { useAccount } from "wagmi";

export function useEthersProvider(): BrowserProvider | null {
  const { connector, chainId } = useAccount();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    let live = true;
    if (!connector) {
      setProvider(null);
      return;
    }
    void connector.getProvider().then((raw) => {
      if (live) setProvider(new BrowserProvider(raw as never, "any"));
    });
    return () => {
      live = false;
    };
  }, [connector, chainId]);

  return provider;
}
