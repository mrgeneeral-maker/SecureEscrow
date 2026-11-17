# SecureEscrow

Paystack-style escrow on Base. A buyer and a seller both use the website: the buyer creates an escrow for a price in naira, the contract locks the ETH equivalent, and the buyer releases it to the seller once the goods arrive. If the seller never delivers, the buyer reclaims the funds after the deadline.

## How it works

1. The buyer enters the seller's wallet, the amount in naira and a delivery window.
2. The contract converts naira to ETH at the on-chain rate and locks it. Any buffer sent above the quote is returned.
3. The buyer calls `release` to pay the seller, or the seller calls `sellerRefund`, or the buyer calls `claimRefund` after the deadline.

The naira price is fixed when the escrow is created. The locked ETH is not re-priced afterwards.

## Naira rate

`koboPerEth` holds the price of one ETH in kobo. Only the `rateUpdater` account can change it, by at most 10% per update, and new escrows are refused when the rate is older than `maxRateAge`.

```bash
npm run rate:update   # one update from the live price
npm run rate:watch    # update every 5 minutes
```

Set `RATE_NGN_PER_ETH` in `.env` to push a fixed value instead of the live price. The owner can rotate the updater with `setRateUpdater`.

## Setup

```bash
npm run setup
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Fill `DEPLOYER_PRIVATE_KEY` and `VITE_WALLETCONNECT_PROJECT_ID`.

## Commands

```bash
npm test                    # all tests
npm run coverage            # coverage report
npm run benchmark:gas       # gas comparison, writes reports/gas-comparison.json
npm run deploy:base-sepolia # deploy and record the address
npm run verify:base-sepolia # verify on Basescan
npm run export:frontend     # copy deployed addresses to the frontend
npm run dev                 # start the frontend
```

Deploy variables: `INITIAL_RATE_NGN_PER_ETH` (defaults to the live price), `RATE_UPDATER` (defaults to the deployer), `MAX_RATE_AGE_SECONDS` (defaults to 86400).

Command line actions: `npx hardhat run scripts/interact/<create-escrow|release|seller-refund|claim-refund|get-escrow>.ts --network baseSepolia` with `SELLER`, `AMOUNT_NGN`, `ESCROW_ID` and `SIGNER_INDEX` set as needed.

## Deploy the frontend

Import the repository in Vercel, set the root directory to `frontend` and add `VITE_WALLETCONNECT_PROJECT_ID`.

## Security

- State changes happen before every external call and fund-moving functions use `nonReentrant`.
- Never commit `.env`. It holds the deployer key.

## License

MIT
