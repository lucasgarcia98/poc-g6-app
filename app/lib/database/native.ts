// app/lib/database/mobile.ts
import { openDatabaseSync } from 'expo-sqlite';
import { Database, EscolaDB, TurmaDB, AlunoDB, PresencaDB } from './types';

interface QueryResult<T = any> {
  rows: T[];
  insertId?: number;
  rowsAffected: number;
}

class MobileDatabase implements Database {
  private db: ReturnType<typeof openDatabaseSync>;

  constructor(db: ReturnType<typeof openDatabaseSync>) {
    this.db = db;
  }

  async updateEscolaSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.executeSql('UPDATE escolas SET synced = ? WHERE id = ?', [synced, id]);
  }

  async updateTurmaSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.executeSql('UPDATE turmas SET synced = ? WHERE id = ?', [synced, id]);
  }

  async updateAlunoSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.executeSql('UPDATE alunos SET synced = ? WHERE id = ?', [synced, id]);
  }

  /**
   * Execute SQL queries (SELECT / INSERT / UPDATE / DELETE)
   * SELECT → usa getAllAsync e retorna rows corretamente
   * DML → usa runAsync
   */
  private async executeSql<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
      const isSelect = sql.trim().toLowerCase().startsWith("select");

      if (isSelect) {
        const rows = await this.db.getAllAsync<T>(sql, params);
        return {
          rows,
          rowsAffected: 0
        };
      }

      const result = await this.db.runAsync(sql, ...params);

      return {
        rows: [],
        insertId: result.lastInsertRowId,
        rowsAffected: result.changes ?? 0
      };
  }

  /**
   * Create tables if not exists
   */
  async ensureTablesExist(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS escolas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        lastSync TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS turmas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        EscolaId INTEGER,
        lastSync TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (EscolaId) REFERENCES escolas (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        TurmaId INTEGER,
        lastSync TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (TurmaId) REFERENCES turmas (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS presencas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        AlunoId INTEGER NOT NULL,
        date TEXT NOT NULL,
        present INTEGER NOT NULL,
        observacao TEXT,
        lastSync TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (AlunoId) REFERENCES alunos (id) ON DELETE CASCADE,
        UNIQUE (AlunoId, date)
      );

      CREATE INDEX IF NOT EXISTS idx_turmas_EscolaId ON turmas(EscolaId);
      CREATE INDEX IF NOT EXISTS idx_alunos_TurmaId ON alunos(TurmaId);
      CREATE INDEX IF NOT EXISTS idx_presencas_AlunoId ON presencas(AlunoId);
      CREATE INDEX IF NOT EXISTS idx_presencas_date ON presencas(date);
    `);
  }

  // -------------------------------
  // ESCOLAS
  // -------------------------------

  async getEscolas(): Promise<EscolaDB[]> {
    const result = await this.executeSql<EscolaDB>('SELECT * FROM escolas');
    return result.rows;
  }

  async getEscola(id: number): Promise<EscolaDB | undefined> {
    const result = await this.executeSql<EscolaDB>('SELECT * FROM escolas WHERE id = ?', [id]);
    return result.rows[0];
  }

  async saveEscola(escola: EscolaDB): Promise<number> {
    const now = new Date().toISOString();

    const result = await this.executeSql(
      escola.id
        // Upsert preserving id when coming from server
        ? 'INSERT OR REPLACE INTO escolas (id, name, address, lastSync) VALUES (?, ?, ?, ?)' 
        : 'INSERT INTO escolas (name, address, lastSync) VALUES (?, ?, ?)',
      escola.id
        ? [escola.id, escola.name, escola.address, now]
        : [escola.name, escola.address, now]
    );

    return result.insertId!;
  }

  async saveEscolas(escolas: EscolaDB[]): Promise<void> {
    for (const escola of escolas) {
      await this.saveEscola(escola)
    }
  }

  async deleteEscola(id: number): Promise<void> {
    await this.executeSql('DELETE FROM escolas WHERE id = ?', [id]);
  }

  // -------------------------------
  // TURMAS
  // -------------------------------

  async getTurmas(escolaId?: number): Promise<TurmaDB[]> {
    if (escolaId) {
      const res = await this.executeSql<TurmaDB>('SELECT * FROM turmas WHERE EscolaId = ?', [escolaId]);
      return res.rows;
    }
    const res = await this.executeSql<TurmaDB>('SELECT * FROM turmas');
    return res.rows;
  }

  async getTurma(id: number): Promise<TurmaDB | undefined> {
    const result = await this.executeSql<TurmaDB>('SELECT * FROM turmas WHERE id = ?', [id]);
    return result.rows[0];
  }

  async saveTurma(turma: TurmaDB): Promise<number> {
    const now = new Date().toISOString();

    const result = await this.executeSql(
      turma.id
        ? 'INSERT OR REPLACE INTO turmas (id, name, EscolaId, lastSync) VALUES (?, ?, ?, ?)' 
        : 'INSERT INTO turmas (name, EscolaId, lastSync) VALUES (?, ?, ?)',
      turma.id
        ? [turma.id, turma.name, turma.EscolaId, now]
        : [turma.name, turma.EscolaId, now]
    );

    return result.insertId!;
  }

  async saveTurmas(turmas: TurmaDB[]): Promise<void> {
    for (const turma of turmas) {
      await this.saveTurma(turma);
    }
  }

  async deleteTurma(id: number): Promise<void> {
    await this.executeSql('DELETE FROM turmas WHERE id = ?', [id]);
  }

  // -------------------------------
  // ALUNOS
  // -------------------------------

  async getAlunos(TurmaId?: number): Promise<AlunoDB[]> {
    if (TurmaId) {
      const res = await this.executeSql<AlunoDB>('SELECT * FROM alunos WHERE TurmaId = ?', [TurmaId]);
      return res.rows;
    }
    const res = await this.executeSql<AlunoDB>('SELECT * FROM alunos');
    return res.rows;
  }

  async getAluno(id: number): Promise<AlunoDB | undefined> {
    const result = await this.executeSql<AlunoDB>('SELECT * FROM alunos WHERE id = ?', [id]);
    return result.rows[0];
  }

  async saveAluno(aluno: AlunoDB): Promise<number> {
    const now = new Date().toISOString();

    const result = await this.executeSql(
      aluno.id
        ? 'INSERT OR REPLACE INTO alunos (id, name, TurmaId, lastSync) VALUES (?, ?, ?, ?)' 
        : 'INSERT INTO alunos (name, TurmaId, lastSync) VALUES (?, ?, ?)',
      aluno.id
        ? [aluno.id, aluno.name, aluno.TurmaId, now]
        : [aluno.name, aluno.TurmaId, now]
    );

    return result.insertId!;
  }

  async saveAlunos(alunos: AlunoDB[]): Promise<void> {
    for (const aluno of alunos) {
      await this.saveAluno(aluno);
    }
  }

  async deleteAluno(id: number): Promise<void> {
    await this.executeSql('DELETE FROM alunos WHERE id = ?', [id]);
  }

  // -------------------------------
  // PRESENÇAS
  // -------------------------------

  async getPresencas(): Promise<PresencaDB[]> {
    const result = await this.executeSql<PresencaDB>('SELECT * FROM presencas');
    return result.rows;
  }

  async getPresenca(id: number): Promise<PresencaDB | undefined> {
    const result = await this.executeSql<PresencaDB>('SELECT * FROM presencas WHERE id = ?', [id]);
    return result.rows[0];
  }

  async getPresencasByAlunoIdAndDate(alunoId: number, date: string): Promise<PresencaDB | undefined> {
    const result = await this.executeSql<PresencaDB>('SELECT * FROM presencas WHERE AlunoId = ? AND date = ?', [alunoId, date]);
    return result.rows[0];
  }

  async savePresenca(presenca: PresencaDB): Promise<number> {
    const now = new Date().toISOString();
    console.log('presenca: ', {presenca})

      const alunoId = presenca.AlunoId || presenca?.Aluno?.id
      if(!alunoId) {
        return 0;
      }
      const find = await this.getPresencasByAlunoIdAndDate(alunoId, presenca.date);
      if(find?.synced) return 0;
      if (find) {
        presenca.id = find.id;
      }

    const result = await this.executeSql(
      presenca.id
        ? 'UPDATE presencas SET AlunoId = ?, date = ?, present = ?, observacao = ?, lastSync = ? WHERE id = ?'
        : 'INSERT INTO presencas (AlunoId, date, present, observacao, lastSync) VALUES (?, ?, ?, ?, ?)',
      presenca.id
        ? [
          presenca.AlunoId,
          presenca.date,
          presenca.present ? 1 : 0,
          presenca.observacao ?? '',
          now,
          presenca.id
          ]
        : [
            presenca.AlunoId,
            presenca.date,
            presenca.present ? 1 : 0,
            presenca.observacao ?? '',
            now
          ]
    );
    return result.insertId!;
  }

  async savePresencas(presencas: PresencaDB[]): Promise<void> {
    for (const p of presencas) {
      if(p.synced) continue;

      await this.savePresenca(p);
    }
  }

  async deletePresenca(id: number): Promise<void> {
    await this.executeSql('DELETE FROM presencas WHERE id = ?', [id]);
  }

  async getPresencasPendentes(): Promise<PresencaDB[]> {
    const result = await this.executeSql<PresencaDB>(
      'SELECT * FROM presencas WHERE synced = 0'
    );
    return result.rows;
  }

  async updatePresencaSyncStatus(id: number, synced: boolean): Promise<void> {
    await this.executeSql(
      'UPDATE presencas SET synced = ? WHERE id = ?',
      [synced ? 1 : 0, id]
    );
  }

  async clearDatabase(): Promise<void> {
    await this.db.execAsync(`
      DELETE FROM presencas;
      DELETE FROM alunos;
      DELETE FROM turmas;
      DELETE FROM escolas;
    `);
  }
}

export const init = async (): Promise<Database> => {
  const db = openDatabaseSync('escola.db', {
    useNewConnection: true,
  });
  const database = new MobileDatabase(db);
  await database.ensureTablesExist();
  return database;
};
