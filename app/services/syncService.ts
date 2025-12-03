// app/services/syncService.ts
import { Escola, Turma, Aluno, Presenca } from '../types';
import { EscolaDB, TurmaDB, AlunoDB, PresencaDB, Database } from '../lib/database/types';

const API_BASE_URL = 'http://localhost:3002';

export class SyncService {
  constructor(private db: Database, private request: <T>(url: string, options?: RequestInit) => Promise<T | null>) {}

  // Sync all data
  async syncAll(): Promise<{ success: boolean; message: string }> {
    try {
      await this.syncEscolas();
      await this.syncTurmas();
      await this.syncAlunos();
      await this.syncPresencas();
      return { success: true, message: 'Sincronização concluída com sucesso' };
    } catch (error) {
      console.error('Erro durante a sincronização:', error);
      return { success: false, message: 'Falha na sincronização' };
    }
  }

  // Sync Escolas
  private async syncEscolas(): Promise<void> {
    // Get unsynced escolas
    const unsyncedEscolas = await this.db.getEscolas();
    
    try {
        await this.request(`${API_BASE_URL}/api/escolas/sync`, {
            method: 'POST',
            body: JSON.stringify({escolas: unsyncedEscolas})
        })
    } catch (error) {
        console.error(`Erro ao sincronizar escolas:`, error);
        throw error;
    }
    
  }

  // Similar implementations for syncTurmas, syncAlunos, and syncPresencas
  private async syncTurmas(): Promise<void> {
    const unsyncedTurmas = await this.db.getTurmas()
    
    try {
         await this.request(`${API_BASE_URL}/api/turmas/sync`, {
            method: 'POST',
            body: JSON.stringify({turmas: unsyncedTurmas})
        })
    } catch (error) {
        console.error(`Erro ao sincronizar turmas:`, error);
        throw error;
    }
  }

  private async syncAlunos(): Promise<void> {
    const unsyncedAlunos = await this.db.getAlunos()
    
    try {
         await this.request(`${API_BASE_URL}/api/alunos/sync`, {
            method: 'POST',
            body: JSON.stringify({alunos: unsyncedAlunos})
        })
    } catch (error) {
        console.error(`Erro ao sincronizar alunos:`, error);
        throw error;
    }
  }

  private async syncPresencas(): Promise<void> {
    const unsyncedPresencas = await this.db.getPresencas()
    
    try {
         await this.request(`${API_BASE_URL}/api/presencas/sync`, {
            method: 'POST',
            body: JSON.stringify({presencas: unsyncedPresencas})
        })
    } catch (error) {
        console.error(`Erro ao sincronizar presencas:`, error);
        throw error;
    }
  }

  // Pull latest data from server
  async pullLatestData(): Promise<void> {
    try {
      // Fetch and update escolas
      const escolas = await this.request<Escola[]>(`${API_BASE_URL}/api/escolas`);
      if (escolas) {
        await this.db.saveEscolas(escolas.map(e => ({ ...e, lastSync: new Date().toISOString() })));
      }

      // Fetch and update turmas
      const turmas = await this.request<Turma[]>(`${API_BASE_URL}/api/turmas`);
      if (turmas) {
        await this.db.saveTurmas(turmas.map(t => ({ ...t, lastSync: new Date().toISOString() })));
      }

      // Fetch and update alunos
      const alunos = await this.request<Aluno[]>(`${API_BASE_URL}/api/alunos`);
      if (alunos) {
        await this.db.saveAlunos(
            alunos.map(a => ({ ...a, lastSync: new Date().toISOString(), TurmaId: a.TurmaId! }))
        );
      }

      // Fetch and update presencas
      const presencas = await this.request<Presenca[]>(`${API_BASE_URL}/api/presencas`);
      if (presencas) {
        await this.db.savePresencas(presencas.map(p => ({ ...p, lastSync: new Date().toISOString() })));
      }
    } catch (error) {
      console.error('Erro ao buscar dados do servidor:', error);
      throw error;
    }
  }
}