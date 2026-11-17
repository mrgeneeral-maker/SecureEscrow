import fs from "node:fs";
import path from "node:path";
import type { DeploymentRecord } from "./utils/deployments";

const DEPLOYMENTS_DIR = path.resolve(__dirname, "..", "deployments");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "..",
  "frontend",
  "src",
  "contracts",
  "deployments.json",
);

function main(): void {
  const files = fs.existsSync(DEPLOYMENTS_DIR)
    ? fs.readdirSync(DEPLOYMENTS_DIR).filter((file) => file.endsWith(".json"))
    : [];

  const output: Record<string, { address: string; network: string; deployedAt: string }> = {};

  for (const file of files) {
    const record = JSON.parse(
      fs.readFileSync(path.join(DEPLOYMENTS_DIR, file), "utf8"),
    ) as DeploymentRecord;

    output[String(record.chainId)] = {
      address: record.address,
      network: path.basename(file, ".json"),
      deployedAt: record.deployedAt,
    };
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);

  const networks = Object.values(output).map((entry) => entry.network);
  console.log(
    networks.length > 0
      ? `Exported ${networks.length} deployment(s) to the frontend: ${networks.join(", ")}`
      : "No deployments found. Deploy first, then run this script again.",
  );
}

main();
