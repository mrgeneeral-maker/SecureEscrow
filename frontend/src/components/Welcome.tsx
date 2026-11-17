import { ConnectButton } from "@rainbow-me/rainbowkit";

const STEPS = [
  ["Lock the payment", "Enter the seller's wallet and the price in naira. The equivalent ETH moves into the contract, not to the seller."],
  ["The seller delivers", "They have until your deadline. If they never do, you can take your money back."],
  ["Release the funds", "When the goods arrive, release the payment. Only then is the seller paid."],
];

export function Welcome() {
  return (
    <section className="welcome">
      <h2>Pay anyone in naira without trusting them.</h2>
      <p className="lede">
        A smart contract holds your payment until you say the goods arrived. No middleman can touch it.
      </p>
      <ol className="how">
        {STEPS.map(([title, text]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <ConnectButton label="Connect wallet to start" />
    </section>
  );
}
