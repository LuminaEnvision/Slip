import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createPublicClient, createWalletClient, getAddress, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, USDG_ADDRESS } from "../lib/chain";
import { DEFAULT_FEE_BPS } from "../lib/fee";
import { slipPayAbi } from "../lib/slip-pay";

const key = process.env.DEPLOYER_PRIVATE_KEY?.trim();
const ownerRaw = process.env.SLIP_OWNER?.trim();

if (!key || !ownerRaw || !isAddress(ownerRaw)) {
  console.error("Set DEPLOYER_PRIVATE_KEY and SLIP_OWNER. SLIP_OWNER is the address that can withdraw. It is not a private key.");
  process.exit(1);
}

const owner = getAddress(ownerRaw);
const account = privateKeyToAccount(key as `0x${string}`);
const forge = existsSync(join(homedir(), ".foundry", "bin", "forge"))
  ? join(homedir(), ".foundry", "bin", "forge")
  : "forge";

execFileSync(forge, ["build", "--root", process.cwd()], { stdio: "inherit" });

const artifactPath = join(process.cwd(), "cache", "forge-out", "SlipPay.sol", "SlipPay.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as { bytecode: { object: string } };
const bytecode = (artifact.bytecode.object.startsWith("0x")
  ? artifact.bytecode.object
  : `0x${artifact.bytecode.object}`) as `0x${string}`;

const publicClient = createPublicClient({ chain: robinhood, transport: http() });
const wallet = createWalletClient({ account, chain: robinhood, transport: http() });

const hash = await wallet.deployContract({
  abi: slipPayAbi,
  bytecode,
  args: [USDG_ADDRESS, owner, DEFAULT_FEE_BPS],
});

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("Deploy failed.", hash);
  process.exit(1);
}

console.log(`SlipPay ${receipt.contractAddress}`);
console.log(`Owner ${owner}`);
console.log(`Set NEXT_PUBLIC_SLIP_PAY=${receipt.contractAddress} and restart the app. Withdraw at /withdraw.`);
