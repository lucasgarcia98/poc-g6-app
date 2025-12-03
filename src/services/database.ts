import { Escola, Turma, Aluno, Presenca } from '@/app/types';
import Dexie, { Table } from 'dexie';

export interface EscolaDB extends Escola {
  lastSync?: Date;
}

export interface TurmaDB extends Turma {
  lastSync?: Date;
}

export interface AlunoDB extends Aluno {
  lastSync?: Date;
}

export interface PresencaDB extends Presenca {
  lastSync?: Date;
}

export class AppDatabase extends Dexie {
  escolas!: Table<EscolaDB, number>;
  turmas!: Table<TurmaDB, number>;
  alunos!: Table<AlunoDB, number>;
  presencas!: Table<PresencaDB, number>;

  constructor() {
    super('escolaAppDB');
    this.version(1).stores({
      escolas: '++id, name, lastSync',
      turmas: '++id, name, EscolaId, lastSync',
      alunos: '++id, name, TurmaId, lastSync',
      presencas: '++id, alunoId, data, presente, syncStatus, lastSync'
    });
  }
}

export const db = new AppDatabase();