import { BrowserProvider, Contract, Interface, formatEther, isError } from "ethers";
import { ESCROW_ABI } from "../contracts/abi";

export enum EscrowState {
  None,
  Funded,
  Released,
  Refunded,
}

export type Role = "buyer" | "seller";

export interface EscrowView {
  id: bigint;
  buyer: string;
  seller: string;
  amount: bigint;
  amountKobo: bigint;
  deadline: number;
  state: EscrowState;
  role: Role;
}

export interface Rate {
  koboPerEth: bigint;
  updatedAt: number;
  maxAge: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  ZeroAmount: "The amount must be greater than zero.",
  AmountTooLarge: "The amount is too large.",
  InvalidSeller: "The seller address is invalid or equals your own.",
  InvalidDeliveryWindow: "The delivery window must be between 1 and 90 days.",
  StaleRate: "The exchange rate is being refreshed. Try again shortly.",
  Underfunded: "The exchange rate moved. Review the amount and try again.",
  NotBuyer: "Only the buyer can perform this action.",
  NotSeller: "Only the seller can perform this action.",
  InvalidState: "This escrow is not in a state that allows this action.",
  DeadlineNotReached: "The delivery deadline has not passed yet.",
  TransferFailed: "The transfer failed because the receiving address rejected the funds.",
};

const KOBO_MAX = 2n ** 64n - 1n;
const BUFFER_BPS = 10_100n;
const iface = new Interface(ESCROW_ABI);
const BATCH_SIZE = 20;

export function getReadContract(provider: BrowserProvider, address: string): Contract {
  return new Contract(address, ESCROW_ABI, provider);
}

export async function getWriteContract(
  provider: BrowserProvider,
  address: string,
): Promise<Contract> {
  const signer = await provider.getSigner();
  return new Contract(address, ESCROW_ABI, signer);
}

export async function fetchRate(provider: BrowserProvider, address: string): Promise<Rate> {
  const contract = getReadContract(provider, address);
  const [koboPerEth, updatedAt, maxAge] = await Promise.all([
    contract.koboPerEth(),
    contract.rateUpdatedAt(),
    contract.maxRateAge(),
  ]);
  return { koboPerEth: BigInt(koboPerEth), updatedAt: Number(updatedAt), maxAge: Number(maxAge) };
}

export function isRateFresh(rate: Rate, now = Date.now()): boolean {
  return now / 1000 - rate.updatedAt <= rate.maxAge;
}

export function quoteWei(amountKobo: bigint, rate: Rate): bigint {
  return (amountKobo * 10n ** 18n + rate.koboPerEth - 1n) / rate.koboPerEth;
}

export function withBuffer(wei: bigint): bigint {
  return (wei * BUFFER_BPS) / 10_000n;
}

export function parseNaira(value: string): bigint | null {
  const match = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(value.trim().replace(/,/g, ""));
  if (!match) return null;
  const kobo = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return kobo > 0n && kobo <= KOBO_MAX ? kobo : null;
}

const nairaFormat = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export function formatNaira(kobo: bigint): string {
  return nairaFormat.format(Number(kobo) / 100);
}

export function formatEth(wei: bigint): string {
  const [whole, fraction = ""] = formatEther(wei).split(".");
  const trimmed = fraction.slice(0, 6).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export async function fetchUserEscrows(
  provider: BrowserProvider,
  address: string,
  account: string,
): Promise<EscrowView[]> {
  const contract = getReadContract(provider, address);
  const count = Number(await contract.escrowCount());
  const me = account.toLowerCase();
  const results: EscrowView[] = [];

  for (let start = 0; start < count; start += BATCH_SIZE) {
    const ids = Array.from({ length: Math.min(BATCH_SIZE, count - start) }, (_, i) => start + i);
    const batch = await Promise.all(ids.map((id) => contract.getEscrow(id)));

    batch.forEach((raw, index) => {
      const buyer = String(raw.buyer);
      const seller = String(raw.seller);
      const role: Role | null =
        buyer.toLowerCase() === me ? "buyer" : seller.toLowerCase() === me ? "seller" : null;
      if (!role) return;

      results.push({
        id: BigInt(ids[index]),
        buyer,
        seller,
        amount: BigInt(raw.amount),
        amountKobo: BigInt(raw.amountKobo),
        deadline: Number(raw.deadline),
        state: Number(raw.state) as EscrowState,
        role,
      });
    });
  }

  return results.sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function parseTxError(error: unknown): string {
  if (isError(error, "ACTION_REJECTED")) {
    return "Transaction rejected in the wallet.";
  }
  if (isError(error, "INSUFFICIENT_FUNDS")) {
    return "Insufficient funds to cover the amount and gas.";
  }
  if (isError(error, "CALL_EXCEPTION") && error.revert) {
    return ERROR_MESSAGES[error.revert.name] ?? `Contract error: ${error.revert.name}`;
  }

  const candidate = error as { data?: unknown; info?: { error?: { data?: unknown } } };
  const data = candidate?.data ?? candidate?.info?.error?.data;
  if (typeof data === "string") {
    const parsed = iface.parseError(data);
    if (parsed) {
      return ERROR_MESSAGES[parsed.name] ?? `Contract error: ${parsed.name}`;
    }
  }

  return error instanceof Error ? error.message : "Unexpected error.";
}

export function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatDeadline(deadline: number, now = Date.now()): string {
  const remaining = deadline * 1000 - now;
  if (remaining <= 0) return "Deadline passed";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
