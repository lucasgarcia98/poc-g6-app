// app/lib/database/mobile.ts
import { openDatabaseSync } from 'expo-sqlite';
import { Database, EscolaDB, TurmaDB, AlunoDB, PresencaDB } from './types';

// Define the shape of our query result
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

  private async executeSql<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return new Promise((resolve, reject) => {
      this.db.withTransactionAsync(
        async () => {
          try {
            const result = await this.db.runAsync(sql, ...params);
            resolve({
              rows: [],
              insertId: result.lastInsertRowId,
              rowsAffected: result.changes || 0
            });
          } catch (error) {
            reject(error);
          }
        }
      ).catch(reject);
    });
  }

  private async ensureTablesExist(): Promise<void> {
    // Create tables if they don't exist
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS escolas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        lastSync TEXT,
        synced BOOLEAN DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS turmas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        EscolaId INTEGER,
        lastSync TEXT,
        synced BOOLEAN DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (EscolaId) REFERENCES escolas (id) ON DELETE SET NULL
      );
    `);

    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        TurmaId INTEGER,
        lastSync TEXT,
        synced BOOLEAN DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (TurmaId) REFERENCES turmas (id) ON DELETE SET NULL
      );
    `);

    // First, check if the observacao column exists
    const tableInfo = await this.executeSql("PRAGMA table_info(presencas)");
    const hasObservacaoColumn = tableInfo.rows.some((col: any) => col.name === 'observacao');
    
    // Create the table if it doesn't exist
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS presencas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        AlunoId INTEGER NOT NULL,
        date TEXT NOT NULL,
        present BOOLEAN NOT NULL,
        observacao TEXT,
        lastSync TEXT,
        synced BOOLEAN DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (AlunoId) REFERENCES alunos (id) ON DELETE CASCADE,
        UNIQUE (AlunoId, date)
      );
    `);
    
    // Add the observacao column if it doesn't exist
    if (!hasObservacaoColumn) {
      await this.executeSql('ALTER TABLE presencas ADD COLUMN observacao TEXT');
    } 

    // Create indexes for better performance
    await this.executeSql('CREATE INDEX IF NOT EXISTS idx_turmas_EscolaId ON turmas(EscolaId);');
    await this.executeSql('CREATE INDEX IF NOT EXISTS idx_alunos_TurmaId ON alunos(TurmaId);');
    await this.executeSql('CREATE INDEX IF NOT EXISTS idx_presencas_alunoId ON presencas(alunoId);');
    await this.executeSql('CREATE INDEX IF NOT EXISTS idx_presencas_date ON presencas(date);');
    await this.executeSql('CREATE INDEX IF NOT EXISTS idx_presencas_syncStatus ON presencas(syncStatus);');
  }

  async getEscolas(): Promise<EscolaDB[]> {
    const result = await this.executeSql<EscolaDB>('SELECT * FROM escolas');
    return result.rows;
  }

  async getEscola(id: number): Promise<EscolaDB | undefined> {
    const result = await this.executeSql('SELECT * FROM escolas WHERE id = ?', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async saveEscola(escola: EscolaDB): Promise<number> {
    const now = new Date().toISOString();
    if (escola.id) {
      await this.executeSql(
        'UPDATE escolas SET name = ?, address = ?, lastSync = ? WHERE id = ?',
        [escola.name, escola.address, now, escola.id]
      );
      return escola.id;
    } else {
      const result = await this.executeSql(
        'INSERT INTO escolas (name, address, lastSync) VALUES (?, ?, ?)',
        [escola.name, escola.address, now]
      );
      return result.insertId || 0;
    }
  }

  async saveEscolas(escolas: EscolaDB[]): Promise<void> {
    await this.executeSql('BEGIN TRANSACTION');
    try {
      for (const escola of escolas) {
        await this.saveEscola(escola);
      }
      await this.executeSql('COMMIT');
    } catch (error) {
      await this.executeSql('ROLLBACK');
      throw error;
    }
  }

  async deleteEscola(id: number): Promise<void> {
    await this.executeSql('DELETE FROM escolas WHERE id = ?', [id]);
  }

  // Turma (Class) related methods
  async getTurmas(escolaId?: number): Promise<TurmaDB[]> {
    let result;
    if (escolaId) {
      result = await this.executeSql<TurmaDB>('SELECT * FROM turmas WHERE EscolaId = ?', [escolaId]);
    } else {
      result = await this.executeSql<TurmaDB>('SELECT * FROM turmas', []);
    }
    return result.rows;
  }

  async getTurma(id: number): Promise<TurmaDB | undefined> {
    const result = await this.executeSql('SELECT * FROM turmas WHERE id = ?', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async saveTurma(turma: TurmaDB): Promise<number> {
    const now = new Date().toISOString();
    if (turma.id) {
      await this.executeSql(
        'UPDATE turmas SET name = ?, EscolaId = ?, lastSync = ? WHERE id = ?',
        [turma.name, turma.EscolaId, now, turma.id] 
      );
      return turma.id;
    } else {
      const result = await this.executeSql(
        'INSERT INTO turmas (name, EscolaId, lastSync) VALUES (?, ?, ?)',
        [turma.name, turma.EscolaId, now]
      );
      return result.insertId || 0;
    }
  }

  async saveTurmas(turmas: TurmaDB[]): Promise<void> {
    await this.executeSql('BEGIN TRANSACTION');
    try {
      for (const turma of turmas) {
        await this.saveTurma(turma);
      }
      await this.executeSql('COMMIT');
    } catch (error) {
      await this.executeSql('ROLLBACK');
      throw error;
    }
  }

  async deleteTurma(id: number): Promise<void> {
    await this.executeSql('DELETE FROM turmas WHERE id = ?', [id]);
  }

  // Aluno (Student) related methods
  async getAlunos(TurmaId?: number): Promise<AlunoDB[]> {
    let result;
    if (TurmaId) {
      result = await this.executeSql<AlunoDB>('SELECT * FROM alunos WHERE TurmaId = ?', [TurmaId]);
    } else {
      result = await this.executeSql<AlunoDB>('SELECT * FROM alunos', []);
    }
    return result.rows;
  }

  async getAluno(id: number): Promise<AlunoDB | undefined> {
    const result = await this.executeSql('SELECT * FROM alunos WHERE id = ?', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async saveAluno(aluno: AlunoDB): Promise<number> {
    const now = new Date().toISOString();
    if (aluno.id) {
      await this.executeSql(
        'UPDATE alunos SET name = ?, TurmaId = ?, lastSync = ? WHERE id = ?',
        [aluno.name, aluno.TurmaId, now, aluno.id]
      );
      return aluno.id;
    } else {
      const result = await this.executeSql(
        'INSERT INTO alunos (name, TurmaId, lastSync) VALUES (?, ?, ?)',
        [aluno.name, aluno.TurmaId, now]
      );
      return result.insertId || 0;
    }
  }

  async saveAlunos(alunos: AlunoDB[]): Promise<void> {
    await this.executeSql('BEGIN TRANSACTION');
    try {
      for (const aluno of alunos) {
        await this.saveAluno(aluno);
      }
      await this.executeSql('COMMIT');
    } catch (error) {
      await this.executeSql('ROLLBACK');
      throw error;
    }
  }

  async deleteAluno(id: number): Promise<void> {
    await this.executeSql('DELETE FROM alunos WHERE id = ?', [id]);
  }

  // Presença (Attendance) related methods
  async getPresencas(): Promise<PresencaDB[]> {
    const query = 'SELECT * FROM presencas';
    const params: any[] = [];

    // No filters for now - return all presenças
    // In the future, we can add filtering logic here if needed

    const result = await this.executeSql<PresencaDB>(query, params);
    return result.rows;
  }

  async getPresenca(id: number): Promise<PresencaDB | undefined> {
    const result = await this.executeSql('SELECT * FROM presencas WHERE id = ?', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async savePresenca(presenca: PresencaDB): Promise<number> {
    const now = new Date().toISOString();
    if (presenca.id) {
      await this.executeSql(
        'UPDATE presencas SET AlunoId = ?, date = ?, present = ?, observacao = ?, lastSync = ? WHERE id = ?',
        [
          presenca.AlunoId, 
          presenca.date, 
          presenca.present ? 1 : 0, 
          presenca.observacao || null, 
          now, 
          presenca.id
        ]
      );
      return presenca.id;
    } else {
      const result = await this.executeSql(
        'INSERT INTO presencas (AlunoId, date, present, observacao, lastSync) VALUES (?, ?, ?, ?, ?)',
        [
          presenca.AlunoId, 
          presenca.date, 
          presenca.present ? 1 : 0, 
          presenca.observacao || null, 
          now
        ]
      );
      return result.insertId || 0;
    }
  }

  async savePresencas(presencas: PresencaDB[]): Promise<void> {
    const now = new Date().toISOString();
    await this.executeSql('BEGIN TRANSACTION');
    try {
      for (const presenca of presencas) {
        // Ensure observacao is included when saving in batch
        const presencaToSave = {
          ...presenca,
          observacao: presenca?.observacao
        };
        await this.savePresenca(presencaToSave);
      }
      await this.executeSql('COMMIT');
    } catch (error) {
      await this.executeSql('ROLLBACK');
      throw error;
    }
  }

  async deletePresenca(id: number): Promise<void> {
    await this.executeSql('DELETE FROM presencas WHERE id = ?', [id]);
  }

  async getPresencasPendentes(): Promise<PresencaDB[]> {
    const result = await this.executeSql<PresencaDB>(
      'SELECT * FROM presencas WHERE syncStatus = ?',
      ['pending']
    );
    return result.rows;
  }

  async updatePresencaSyncStatus(id: number, synced: boolean): Promise<void> {
    const status = synced ? 'synced' : 'pending';
    await this.executeSql('UPDATE presencas SET syncStatus = ? WHERE id = ?', [status, id]);
  }

  async clearDatabase(): Promise<void> {
    await this.executeSql('DELETE FROM presencas');
    await this.executeSql('DELETE FROM alunos');
    await this.executeSql('DELETE FROM turmas');
    await this.executeSql('DELETE FROM escolas');
  }
}

export const init = async (): Promise<Database> => {
  const db = openDatabaseSync('escola.db');
  const database = new MobileDatabase(db);
  await database['ensureTablesExist']();
  return database;
};