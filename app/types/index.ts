import { Database } from "../lib/database";

interface BaseEntity {
  id?: number;
  synced: boolean;
  createdAt?: string;  // ISO date-time string
  updatedAt?: string;  // ISO date-time string
}

export interface Escola extends BaseEntity {
  name: string;
  address: string;
}

export interface Turma extends BaseEntity {
  name: string;
  EscolaId: number | null;
}

export interface Aluno extends BaseEntity {
  name: string;
  TurmaId: number | null;
  PresencaId?: number | null;
  Turma?: Turma;
  Presencas?: Presenca[];
}

export interface Presenca extends BaseEntity {
  AlunoId: number;
  date: string; // Formato: YYYY-MM-DD
  present: boolean;
  observacao?: string;
  lastSync?: string;
}

export interface PresencaContextData {
  escolas: Escola[];
  turmas: Turma[];
  alunos: Aluno[];
  presencas: Presenca[];
  escolaSelecionada: Escola | null;
  turmaSelecionada: Turma | null;
  dataSelecionada: string;
  carregando: boolean;
  erro: string | null;
  buscarEscolas: (db?: Database) => Promise<void>;
  selecionarEscola: (escola: Escola) => Promise<void>;
  buscarTurmas: (db?: Database) => Promise<void>;
  selecionarTurma: (turma: Turma) => Promise<void>;
  buscarAlunos: (db?: Database) => Promise<void>;
  buscarPresencasPorAluno: (alunoId: number, data?: string) => Promise<void>;
  buscarPresencasSemFiltro: () => Promise<void>;
  registrarPresenca: (alunoId: number, presente: boolean, observacao?: string) => Promise<boolean>;
  alterarData: (data: string) => void;
  alterarAluno: (aluno: Aluno) => void;
  buscarTurmasByEscolaId: (escolaId: number) => Promise<void>;
  buscarAlunosByTurmaId: (turmaId: number) => Promise<void>;
  isOnline: boolean;
  sincronizar: () => Promise<boolean | undefined>;
  syncStatus: { loading: boolean; lastSync?: Date; error?: string };
  pendingPresencas: number;
}