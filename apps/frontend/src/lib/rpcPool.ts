const RPC_ENDPOINTS = [
  'https://go.getblock.us/86aac42ad4484f3c813079afc201451c',
  'https://solana-mainnet.gateway.tatum.io/',
  'https://solana-rpc.publicnode.com/',
  'https://api.blockeden.xyz/solana/KeCh6p22EX5AeRHxMSmc',
  'https://sol-protect.rpc.blxrbdn.com/',
  'https://solana.drpc.org/',
  'https://solana.leorpc.com/?api_key=FREE',
  'https://solana.api.onfinality.io/public',
  'https://api.mainnet-beta.solana.com',
  'https://public.rpc.solanavibestation.com/',
  'https://solana.rpc.subquery.network/public',
];

const STORAGE_KEY = 'pmai_rpc_status';

interface RpcStatus {
  [url: string]: boolean;
}

function loadStatus(): RpcStatus {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatus(status: RpcStatus): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch {
    // ignore
  }
}

function allDisabled(status: RpcStatus): boolean {
  return Object.keys(status).length >= RPC_ENDPOINTS.length &&
    RPC_ENDPOINTS.every((url) => status[url] === false);
}

export function getRpcUrl(): string {
  const status = loadStatus();

  // If all marked as disabled — reset all to enabled
  if (allDisabled(status)) {
    const reset: RpcStatus = {};
    RPC_ENDPOINTS.forEach((url) => { reset[url] = true; });
    saveStatus(reset);
    const idx = Math.floor(Math.random() * RPC_ENDPOINTS.length);
    return RPC_ENDPOINTS[idx];
  }

  // Collect enabled endpoints
  const enabled = RPC_ENDPOINTS.filter((url) => status[url] !== false);

  // Pick random
  const idx = Math.floor(Math.random() * enabled.length);
  return enabled[idx];
}

export function markRpcFailed(url: string): void {
  const status = loadStatus();
  status[url] = false;
  saveStatus(status);
}

export function markRpcOk(url: string): void {
  const status = loadStatus();
  status[url] = true;
  saveStatus(status);
}

export function getAllEndpoints(): string[] {
  return [...RPC_ENDPOINTS];
}
