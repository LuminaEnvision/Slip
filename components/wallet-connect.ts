import type { CreateConnectorFn } from "wagmi";

type WalletConnectConfig = {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
};

// The public `wagmi/connectors` entry loads every connector, including Base
// Account, which depends on an optional package this app does not use.
// This file imports WalletConnect directly.
// @ts-ignore deep import is outside the package exports map on purpose
import { walletConnect as walletConnectRaw } from "../node_modules/@wagmi/connectors/dist/esm/walletConnect.js";

export const walletConnect = walletConnectRaw as (parameters: WalletConnectConfig) => CreateConnectorFn;
