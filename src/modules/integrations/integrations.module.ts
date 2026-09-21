import { Module } from '@nestjs/common';

/**
 * Kerangka integrasi BPJS & SATUSEHAT (belum aktif).
 * Rencana: tabel integration_outbox/logs/configs + external_identifiers, worker outbox,
 * dan adapter per sistem yang didaftarkan lewat token EXTERNAL_ADAPTERS.
 * Modul inti tidak boleh mengimpor modul ini; mereka hanya menerbitkan domain event.
 */
@Module({})
export class IntegrationsModule {}
