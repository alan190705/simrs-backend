export type ExternalSystem = 'BPJS' | 'SATUSEHAT';

export interface OutboxEvent { id: string; branchId: string; type: string; payload: unknown }

/** Kontrak untuk setiap sistem eksternal. Implementasi (SatusehatAdapter, BpjsAdapter) menyusul. */
export interface ExternalSystemAdapter {
  readonly system: ExternalSystem;
  supports(eventType: string): boolean;
  send(event: OutboxEvent): Promise<void>;
}

export const EXTERNAL_ADAPTERS = Symbol('EXTERNAL_ADAPTERS');
