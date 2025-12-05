import { Escola, Turma, Aluno, Presenca } from '../../types';

export interface EscolaDB extends Omit<Escola, 'id'> { 
  id?: number;
  lastSync?: string;
}

export interface TurmaDB extends Omit<Turma, 'id'> {
  id?: number;
  EscolaId: number | null;
  lastSync?: string;
}

export interface AlunoDB extends Omit<Aluno, 'id'> {
  id?: number;
  TurmaId: number;
  lastSync?: string;
  turma?: TurmaDB | null;
}

export interface PresencaDB extends Omit<Presenca, 'id'> {
  id?: number;
  date: string;
  present: boolean;
  observacao?: string;
  AlunoId: number;
  lastSync?: string;
  Aluno?: AlunoDB | null;
  synced: boolean;
}

// If you need a type that includes presencas, create a new type
export interface PresencaWithNested extends PresencaDB {
  presencas?: PresencaDB[];
}

export interface Database {
  // Escolas
  getEscolas: () => Promise<EscolaDB[]>;
  getEscola: (id: number) => Promise<EscolaDB | undefined>;
  saveEscola: (escola: EscolaDB) => Promise<number>;
  saveEscolas: (escolas: EscolaDB[]) => Promise<void>;
  deleteEscola: (id: number) => Promise<void>;
  updateEscolaSyncStatus: (id: number, synced: boolean) => Promise<void>;
  
  // Turmas
  getTurmas: (escolaId?: number) => Promise<TurmaDB[]>;
  getTurma: (id: number) => Promise<TurmaDB | undefined>;
  saveTurma: (turma: TurmaDB) => Promise<number>;
  saveTurmas: (turmas: TurmaDB[]) => Promise<void>;
  deleteTurma: (id: number) => Promise<void>;
  updateTurmaSyncStatus: (id: number, synced: boolean) => Promise<void>;
  
  // Alunos
  getAlunos: (turmaId?: number) => Promise<AlunoDB[]>;
  getAluno: (id: number) => Promise<AlunoDB | undefined>;
  saveAluno: (aluno: AlunoDB) => Promise<number>;
  saveAlunos: (alunos: AlunoDB[]) => Promise<void>;
  deleteAluno: (id: number) => Promise<void>;
  updateAlunoSyncStatus: (id: number, synced: boolean) => Promise<void>;
  
  // Presenças
  getPresencas: () => Promise<PresencaDB[]>;
  getPresenca: (id: number) => Promise<PresencaDB | undefined>;
  savePresenca: (presenca: PresencaDB) => Promise<number>;
  savePresencas: (presencas: PresencaDB[]) => Promise<void>;
  deletePresenca: (id: number) => Promise<void>;
  getPresencasPendentes: () => Promise<PresencaDB[]>;
  updatePresencaSyncStatus: (id: number, synced: boolean) => Promise<void>;
  
  // Utilitários
  clearDatabase: () => Promise<void>;
}