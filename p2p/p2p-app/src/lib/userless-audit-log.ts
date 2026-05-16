import type { UserlessEventMap, UserlessEventSink } from "./userless-events";

export type AuditLogRecord = {
  timestamp: string;
  event: keyof UserlessEventMap;
  details?: string;
};

export type UserlessAuditLogCollectorOptions = {
  maxEntries?: number;
};

function stringifyPayload(payload: unknown): string | undefined {
  if (payload === undefined) {
    return undefined;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export class UserlessAuditLogCollector implements UserlessEventSink {
  private readonly records: AuditLogRecord[] = [];
  private readonly maxEntries: number;

  constructor(options: UserlessAuditLogCollectorOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 1000);
  }

  emit<K extends keyof UserlessEventMap>(
    event: K,
    payload: UserlessEventMap[K],
  ): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      event,
      details: stringifyPayload(payload),
    });

    if (this.records.length > this.maxEntries) {
      this.records.splice(0, this.records.length - this.maxEntries);
    }
  }

  public getAuditLog(): AuditLogRecord[] {
    return [...this.records];
  }

  public clear(): void {
    this.records.length = 0;
  }
}

export function createAuditLogCollector(
  options: UserlessAuditLogCollectorOptions = {},
): UserlessAuditLogCollector {
  return new UserlessAuditLogCollector(options);
}

export function createAuditLogSink(
  options: UserlessAuditLogCollectorOptions = {},
): { collector: UserlessAuditLogCollector; sink: UserlessEventSink } {
  const collector = new UserlessAuditLogCollector(options);
  return { collector, sink: collector };
}
