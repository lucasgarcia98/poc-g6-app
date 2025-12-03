// app/lib/database/web.ts
import Dexie, { Table } from 'dexie';
import { Database, EscolaDB, TurmaDB, AlunoDB, PresencaDB } from './types';

class WebDatabase extends Dexie implements Database {
  escolas!: Table<EscolaDB, number>;
  turmas!: Table<TurmaDB, number>;
  alunos!: Table<AlunoDB, number>;
  presencas!: Table<PresencaDB, number>;

  constructor() {
    super('escolaAppDB');
    
    this.version(3).stores({
      escolas: '++id, name, address, createdAt, updatedAt, lastSync',
      turmas: '++id, name, EscolaId, createdAt, updatedAt, lastSync, [EscolaId]',
      alunos: '++id, name, TurmaId, createdAt, updatedAt, lastSync, [TurmaId]',
      presencas: '++id, AlunoId, date, presente, lastSync, createdAt, updatedAt, [AlunoId+date]'
    });
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
        lastSync: now
      });
      return turma.id;
    }
    return this.turmas.add({
      ...turma,
      lastSync: now
    });
  }

  async saveTurmas(turmas: TurmaDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.turmas.bulkPut(
      turmas.map(t => ({
        ...t,
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
        lastSync: now
      });
      return aluno.id;
    }
    return this.alunos.add({
      ...aluno,
      lastSync: now
    });
  }

  async saveAlunos(alunos: AlunoDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.alunos.bulkPut(
      alunos.map(a => ({
        ...a,
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

  async savePresenca(presenca: PresencaDB): Promise<number> {
    const now = new Date().toISOString();
    const presencaToSave:PresencaDB = {
      ...presenca,
      lastSync: now,
    };

    if (presenca.id) {
      await this.presencas.update(presenca.id, presencaToSave);
      return presenca.id;
    }
    return this.presencas.add(presencaToSave);
  }

  async savePresencas(presencas: PresencaDB[]): Promise<void> {
    console.log({
      presencas
    })
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
      .where('lastSync')
      .equals(undefined as any)
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
    await this.presencas.update(id, { lastSync: synced ? now : undefined });
  }
}

export const init = async (): Promise<Database> => {
  const db = new WebDatabase();
  return db;
};