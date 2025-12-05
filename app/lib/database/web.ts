// app/lib/database/web.ts
import Dexie, { Table } from 'dexie';
import { Database, EscolaDB, TurmaDB, AlunoDB, PresencaDB } from './types';
import { Presenca } from '@/app/types';

class WebDatabase extends Dexie implements Database {
  escolas!: Table<EscolaDB, number>;
  turmas!: Table<TurmaDB, number>;
  alunos!: Table<AlunoDB, number>;
  presencas!: Table<PresencaDB, number>;

  constructor() {
    super('escolaAppDB');

    this.version(4).stores({
      escolas: '++id, name, address, createdAt, updatedAt, synced',
      turmas: '++id, name, EscolaId, createdAt, updatedAt, synced, [EscolaId]',
      alunos: '++id, name, TurmaId, createdAt, updatedAt, synced, [TurmaId]',
      presencas: '++id, AlunoId, date, presente, observacao, lastSync, synced, createdAt, updatedAt, [AlunoId+date]'
    });
  }

  async updateEscolaSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.escolas.update(id, { synced });
  }

  async updateTurmaSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.turmas.update(id, { synced });
  }

  async updateAlunoSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.alunos.update(id, { synced });
  }
  // Escola methods
  async getEscolas(): Promise<EscolaDB[]> {
    return this.escolas.toArray();
  }

  async getEscola(id: number): Promise<EscolaDB | undefined> {
    return this.escolas.get(id);
  }

  async saveEscola(escola: EscolaDB): Promise<number> {
    const now = new Date().toISOString();
    if (escola.id) {
      await this.escolas.update(escola.id, {
        ...escola,
        synced: true,
        lastSync: now
      });
      return escola.id;
    }
    return this.escolas.add({
      ...escola,
      lastSync: now
    });
  }

  async saveEscolas(escolas: EscolaDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.escolas.bulkPut(
      escolas.map(escola => ({
        ...escola,
        lastSync: now
      }))
    );
  }

  async deleteEscola(id: number): Promise<void> {
    await this.escolas.delete(id);
  }

  // Turma methods
  async getTurmas(escolaId?: number): Promise<TurmaDB[]> {
    if (escolaId) {
      return this.turmas.where('EscolaId').equals(escolaId).toArray();
    }
    return this.turmas.toArray();
  }

  async getTurma(id: number): Promise<TurmaDB | undefined> {
    return this.turmas.get(id);
  }

  async saveTurma(turma: TurmaDB): Promise<number> {
    const now = new Date().toISOString();
    if (turma.id) {
      await this.turmas.update(turma.id, {
        ...turma,
        synced: true,
        lastSync: now
      });
      return turma.id;
    }
    return this.turmas.add({
      ...turma,
      synced: true,
      lastSync: now
    });
  }

  async saveTurmas(turmas: TurmaDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.turmas.bulkPut(
      turmas.map(t => ({
        ...t,
        synced: true,
        lastSync: now
      }))
    );
  }

  async deleteTurma(id: number): Promise<void> {
    await this.turmas.delete(id);
  }

  // Aluno methods
  async getAlunos(TurmaId?: number): Promise<AlunoDB[]> {
    if (TurmaId) {
      return this.alunos.where('TurmaId').equals(TurmaId).toArray();
    }
    return this.alunos.toArray();
  }

  async getAluno(id: number): Promise<AlunoDB | undefined> {
    return this.alunos.get(id);
  }

  async saveAluno(aluno: AlunoDB): Promise<number> {
    const now = new Date().toISOString();
    if (aluno.id) {
      await this.alunos.update(aluno.id, {
        ...aluno,
        synced: true,
        lastSync: now
      });
      return aluno.id;
    }
    return this.alunos.add({
      ...aluno,
      synced: true,
      lastSync: now
    });
  }

  async saveAlunos(alunos: AlunoDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.alunos.bulkPut(
      alunos.map(a => ({
        ...a,
        synced: true,
        lastSync: now
      }))
    );
  }

  async deleteAluno(id: number): Promise<void> {
    await this.alunos.delete(id);
  }

  // Presenca methods
  async getPresencas(): Promise<PresencaDB[]> {
    return this.presencas.toArray();
  }

  async getPresenca(id: number): Promise<PresencaDB | undefined> {
    return this.presencas.get(id);
  }

  async updatePresencasInAluno(alunoId: number, present: boolean, date: string, observacao: string = ''): Promise<number> {
    const aluno = await this.alunos.get(alunoId);
    if (!aluno) return 0;

    let novasPresencas: Presenca[] = [];

    if (aluno?.Presencas) {
      const existingPresencaIndex = aluno.Presencas.findIndex(p => p.date === date);
      if (existingPresencaIndex >= 0) {
        // Update existing presenca
        novasPresencas = [...aluno.Presencas];
        novasPresencas[existingPresencaIndex] = {
          ...novasPresencas[existingPresencaIndex],
          present,
          observacao: observacao || novasPresencas[existingPresencaIndex].observacao
        };
      } else {
        // Add new presenca
        const novaPresenca: Presenca = {
          AlunoId: alunoId,
          date,
          present,
          observacao,
          synced: false
        };
        novasPresencas = [...aluno.Presencas, novaPresenca];
      }
    } else {
      const novaPresenca: Presenca = {
        AlunoId: alunoId,
        date,
        present,
        observacao,
        synced: false
      };
      novasPresencas.push(novaPresenca);
    }

    const updateAluno = await this.alunos.update(alunoId, {
      Presencas: novasPresencas,
    });

    return updateAluno
  }

  async savePresenca(presenca: PresencaDB): Promise<number> {
    const now = new Date().toISOString();
    const presencaToSave: PresencaDB = {
      ...presenca,
      lastSync: now,
    };

    if (presenca.id) {
      const update = await this.presencas.update(presenca.id, presencaToSave);
      if (update) {
        await this.updatePresencasInAluno(
          presenca.AlunoId,
          presenca.present,
          presenca.date,
          presenca.observacao
        );
      }
      return presenca.id;
    } else {
      const addPresenca = await this.presencas.add(presencaToSave);

      if (addPresenca) {
        await this.updatePresencasInAluno(
          presenca.AlunoId,
          presenca.present,
          presenca.date,
          presenca.observacao
        );
        return addPresenca
      }

      return addPresenca
    }
  }

  async savePresencas(presencas: PresencaDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.presencas.bulkPut(
      presencas.map(p => ({
        ...p,
        lastSync: now,
      }))
    );
  }

  async deletePresenca(id: number): Promise<void> {
    await this.presencas.delete(id);
  }

  async getPresencasPendentes(): Promise<PresencaDB[]> {
    return this.presencas
      .where('synced')
      .equals('')
      .toArray();
  }

  async clearDatabase(): Promise<void> {
    await Promise.all([
      this.escolas.clear(),
      this.turmas.clear(),
      this.alunos.clear(),
      this.presencas.clear()
    ]);
  }

  async updatePresencaSyncStatus(id: number, synced: boolean): Promise<void> {
    const now = new Date().toISOString();
    await this.presencas.update(id, { synced, lastSync: now });
  }
}

export const init = async (): Promise<Database> => {
  const db = new WebDatabase();
  return db;
};