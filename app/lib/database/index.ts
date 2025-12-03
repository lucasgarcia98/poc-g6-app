import { Platform } from 'react-native';
import { init as initWebDB } from './web';
import { init as initMobileDB } from './mobile';
import { Database } from './types';

let db: Database;

export const initDatabase = async (): Promise<Database> => {
  if (!db) {
    if (Platform.OS === 'web') {
      db = await initWebDB();
    } else {
      db = await initMobileDB();
    }
  }
  return db;
};

// Tipos comuns
export * from './types';