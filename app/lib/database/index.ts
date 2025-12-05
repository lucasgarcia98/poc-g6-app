import { Platform } from 'react-native';
import { init as initWebDB } from './web';
import { init as initNativeDB } from './native';
import { Database } from './types';

let dbInstance: Database | null = null;
let initializing: Promise<Database> | null = null;

export const initDatabase = async (): Promise<Database> => {
  // Retorna a instância se já estiver criada
  if (dbInstance) {
    return dbInstance;
  }

  // Evita múltiplas inicializações simultâneas
  if (!initializing) {
    initializing = (async () => {
      const instance =
        Platform.OS === 'web'
          ? await initWebDB()
          : await initNativeDB();

      if (!instance) {
        throw new Error('Database instance could not be initialized');
      }

      dbInstance = instance;
      return instance;
    })();
  }

  return initializing;
};

// Re-exporta os tipos
export * from './types';
