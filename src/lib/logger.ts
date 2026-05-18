import { createHash } from 'crypto';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

type LogData = Record<string, string | number | boolean | null | undefined>;

export function log(action: string, data: LogData = {}): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    action,
    ...data,
  }));
}

export function logWithIp(action: string, ip: string, data: LogData = {}): void {
  log(action, { ip_hash: hashIp(ip), ...data });
}
