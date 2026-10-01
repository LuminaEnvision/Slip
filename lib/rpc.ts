import "server-only";
import { createPublicClient, http } from "viem";
import { robinhood } from "./chain";

export const rpc = createPublicClient({
  chain: robinhood,
  transport: http(robinhood.rpcUrls.default.http[0], { timeout: 20_000 }),
});
