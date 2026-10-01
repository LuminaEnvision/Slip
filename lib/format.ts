const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hourCycle: "h23",
});

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY.format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatWhen(unixSeconds: number): string {
  return `${WHEN.format(new Date(unixSeconds * 1000))} UTC`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
