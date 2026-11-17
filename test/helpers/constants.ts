import { parseEther } from "ethers";

export const KOBO_PER_ETH = 500_000_000n;
export const AMOUNT_KOBO = 500_000_000n;
export const AMOUNT = parseEther("1");
export const DELIVERY_WINDOW = 7 * 24 * 60 * 60;
export const MAX_DELIVERY_WINDOW = 90 * 24 * 60 * 60;
export const MAX_RATE_AGE = 24 * 60 * 60;

export enum EscrowState {
  None,
  Funded,
  Released,
  Refunded,
}
