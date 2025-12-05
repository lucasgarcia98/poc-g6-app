// app/contexts/PresencaContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import {
  Escola,
  Turma,
  Aluno,
  Presenca,
  PresencaContextData
} from '../types';

import { useApi } from '../hooks/useApi';
import { AlunoDB, Database, initDatabase } from '../lib/database';
import { EscolaDB, TurmaDB, PresencaDB } from '../lib/database/types';
import { SyncService } from '../services/syncService';
import { API_URL } from '@env';

function mapDbEscolaToEscola(e: EscolaDB): Escola {
  return {
    id: e.id!,
    name: e.name,
    address: e.address,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    synced: !!e.synced
  };
}

function mapDbTurmaToTurma(t: TurmaDB): Turma {
  return {
    id: t.id!,
    name: t.name,
    EscolaId: t.EscolaId!,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    synced: !!t.synced
  };
}

function mapDbAlunoToAluno(a: AlunoDB): Aluno {
  return {
    id: a.id!,
    name: a.name,
    TurmaId: a.TurmaId!,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    synced: !!a.synced,
    Presencas: a.Presencas ?? []
  };
}

function mapDbPresencaToPresenca(p: PresencaDB): Presenca {
  return {
    id: p.id!,
    AlunoId: p.AlunoId!,
    date: p.date,
    present: !!p.present,
    observacao: p.observacao,
    synced: !!p.synced,
    lastSync: p.lastSync,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

const PresencaContext = createContext<PresencaContextData>({} as PresencaContextData);

interface PresencaProviderProps {
  children: React.ReactNode;
}

export const PresencaProvider: React.FC<PresencaProviderProps> = ({ children }) => {
  // --- state ---
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState<Escola | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; lastSync?: Date; error?: string }>({
    loading: false
  });

  // --- refs to keep stable instances ---
  const dbRef = useRef<Database | null>(null);
  const initializingRef = useRef<Promise<Database> | null>(null);
  const requestRef = useRef(useApi().request); // capture request initially
  const syncServiceRef = useRef<SyncService | null>(null);
  const isSyncingRef = useRef(false);

  // Keep requestRef updated if useApi returns a new request (rare but safe)
  const { request } = useApi();
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  // --- util helpers ---
  const safeSetErro = useCallback((message: string | null) => {
    setErro(message);
  }, []);

  // Initialize DB once on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // ensure only one initDatabase in-flight
        if (!initializingRef.current) {
          initializingRef.current = initDatabase();
        }
        const db = await initializingRef.current;
        if (!mounted) return;
        dbRef.current = db;

        // create sync service once db + request exist
        if (!syncServiceRef.current) {
          syncServiceRef.current = new SyncService(db, requestRef.current);
        }

        // load local data first
        await loadLocalData();

        // if online, perform an initial sync (non-blocking for UI)
        // if (isOnline) {
        //   void sincronizar(); // kick off but don't await here
        // }
      } catch (err) {
        console.error('Erro ao inicializar DB:', err);
        if (mounted) safeSetErro('Falha ao inicializar o armazenamento local');
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // --- Online/offline monitoring (single, cross-platform) ---
  useEffect(() => {
    let mounted = true;

    const setOnlineState = (state: boolean) => {
      if (!mounted) return;
      setIsOnline(state);
    };

    // Web
    if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
      const onOnline = () => {
        setOnlineState(true);
        // trigger sync when coming online
        // void sincronizar();
      };
      const onOffline = () => setOnlineState(false);

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      // initial
      setOnlineState(navigator.onLine);

      return () => {
        mounted = false;
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    // React Native
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false;
      setOnlineState(connected);
      if (connected) {
        // void sincronizar();
      }
    });

    // initial fetch
    NetInfo.fetch().then(s => {
      if (!mounted) return;
      setOnlineState(s.isConnected ?? false);
    }).catch(() => { /* ignore */ });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []); // run once

  // --- Helper: load local data into state (fast) ---
  const loadLocalData = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;

    try {
      setCarregando(true);
      // Load escolas, turmas, alunos, presencas from local DB
      const [localEscolas, localTurmas, localAlunos, localPresencas] = await Promise.all([
        db.getEscolas(),
        db.getTurmas(),
        db.getAlunos(),
        db.getPresencas()
      ]);

      setEscolas(localEscolas.map(mapDbEscolaToEscola));

      setTurmas(localTurmas.map(mapDbTurmaToTurma));

      setAlunos(localAlunos.map(mapDbAlunoToAluno));

      setPresencas(localPresencas.map(mapDbPresencaToPresenca));
    } catch (err) {
      console.error('Erro ao carregar dados locais:', err);
      safeSetErro('Erro ao carregar dados locais');
    } finally {
      setCarregando(false);
    }
  }, [safeSetErro]);

  // --- Sync: push & pull (single in-flight) ---
  const sincronizar = useCallback(async (): Promise<boolean> => {
    const db = dbRef.current;
    const syncService = syncServiceRef.current;
    if (!db || !syncService) {
      setSyncStatus({ loading: false, error: 'Serviço de sincronização não inicializado' });
      return false;
    }
    if (!isOnline) {
      setSyncStatus({ loading: false, error: 'Sem conexão com a internet' });
      return false;
    }
    
    if (isSyncingRef.current) {
      // já sincronizando
      
      return false;
    }
    setEscolas([]);
    setTurmas([]);
    setAlunos([]);
    setPresencas([]);
    setEscolaSelecionada(null);
    setTurmaSelecionada(null);
    isSyncingRef.current = true;
    setSyncStatus({ loading: true });

    try {
      // Push local pending
      await syncService.syncAll();
      // Pull fresh state
      await syncService.pullLatestData();

      // Reload local into UI
      await loadLocalData();

      setSyncStatus({ loading: false, lastSync: new Date() });
      return true;
    } catch (err) {
      console.error('Erro na sincronização:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setSyncStatus({ loading: false, error: `Falha na sincronização: ${msg}` });
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [isOnline, loadLocalData]);

  // --- Data fetching helpers (try remote then fallback local) ---
  // All these functions use dbRef and requestRef to avoid unstable deps

  const buscarEscolas = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let escolasData: Escola[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Escola[]>(`${API_URL}/api/escolas`);
          if (resp && Array.isArray(resp)) {
            escolasData = resp;
            // normalize and save to local db
            await db.saveEscolas(escolasData.map(e => ({
              id: e.id,
              name: e.name,
              address: e.address,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
              synced: true
            })));
          }
        } catch (err) {
          console.warn('API escolas falhou, usando local', err);
        }
      }

      if (escolasData.length === 0) {
        const local = await db.getEscolas();
        escolasData = local.map(mapDbEscolaToEscola);
      }

      setEscolas(escolasData);
    } catch (err) {
      console.error('Erro ao buscar escolas:', err);
      setErro('Não foi possível carregar as escolas.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarTurmas = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let turmasData: Turma[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Turma[]>(`${API_URL}/api/turmas`);
          if (resp && Array.isArray(resp)) {
            turmasData = resp;
            await db.saveTurmas(resp.map(t => ({
              id: t.id,
              name: t.name,
              EscolaId: t.EscolaId,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              synced: true
            })));
          }
        } catch (err) {
          console.warn('API turmas falhou, usando local', err);
        }
      }

      if (turmasData.length === 0) {
        const local = await db.getTurmas();
        turmasData = local.map(mapDbTurmaToTurma);
      }

      setTurmas(turmasData);
    } catch (err) {
      console.error('Erro ao buscar turmas:', err);
      setErro('Não foi possível carregar as turmas.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarTurmasByEscolaId = useCallback(async (escolaId: number) => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let turmasData: Turma[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Turma[]>(`${API_URL}/api/escolas/${escolaId}/turmas`);
          if (resp && Array.isArray(resp)) {
            turmasData = resp;
            await db.saveTurmas(resp.map(t => ({
              id: t.id,
              name: t.name,
              EscolaId: t.EscolaId,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              synced: true
            })));
          }
        } catch (err) {
          console.warn('API turmas por escola falhou, usando local', err);
        }
      }

      if (turmasData.length === 0) {
        const local = await db.getTurmas(escolaId);
        turmasData = local.map(mapDbTurmaToTurma);
      }

      setTurmas(turmasData);
    } catch (err) {
      console.error('Erro ao buscar turmas por escola:', err);
      setErro('Não foi possível carregar as turmas.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarAlunos = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let alunosData: Aluno[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Aluno[]>(`${API_URL}/api/alunos`);
          if (resp && Array.isArray(resp)) {
            alunosData = resp;
            await db.saveAlunos(resp.map(a => {
              if(!a.TurmaId) return;

              return {
                id: a.id,
                name: a.name,
                TurmaId: a?.TurmaId ?? 0,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
                Presencas: a.Presencas ?? [],
                synced: true,
              };
            }).filter(a => !!a));
          }
        } catch (err) {
          console.warn('API alunos falhou, usando local', err);
        }
      }

      if (alunosData.length === 0) {
        const local = await db.getAlunos();
        alunosData = local.map(mapDbAlunoToAluno);
      }

      setAlunos(alunosData);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
      setErro('Não foi possível carregar os alunos.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarAlunosByTurmaId = useCallback(async (turmaId: number) => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let alunosData: Aluno[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Aluno[]>(`${API_URL}/api/turmas/${turmaId}/alunos`);
          if (resp && Array.isArray(resp)) {
            alunosData = resp;
            await db.saveAlunos(resp.map(a => {
              if(!a.TurmaId) return;

              return {
                id: a.id,
                name: a.name,
                TurmaId: a.TurmaId,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
                Presencas: a.Presencas ?? [],
                synced: true
              };
            }).filter(a => !!a));
          }
        } catch (err) {
          console.warn('API alunos por turma falhou, usando local', err);
        }
      }

      if (alunosData.length === 0) {
        const local = await db.getAlunos(turmaId);
        alunosData = local.map(mapDbAlunoToAluno);
      }

      setAlunos(alunosData);
    } catch (err) {
      console.error('Erro ao buscar alunos por turma:', err);
      setErro('Não foi possível carregar os alunos.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarPresencasPorAluno = useCallback(async (alunoId: number, date?: string) => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let presencasData: Presenca[] = [];

      // build url
      let url = `${API_URL}/api/alunos/${alunoId}/presencas`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (params.toString()) url += `?${params.toString()}`;

      if (isOnline) {
        try {
          const resp = await requestRef.current<Presenca[]>(url);
          if (resp && Array.isArray(resp)) {
            presencasData = resp.map(p => ({
              id: p.id,
              AlunoId: p.AlunoId,
              date: p.date,
              present: p.present,
              observacao: p.observacao,
              synced: true,
              lastSync: p.lastSync,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            }));
            await db.savePresencas(presencasData);
          }
        } catch (err) {
          console.warn('API presencas por aluno falhou, usando local', err);
        }
      }

      if (presencasData.length === 0) {
        const local = await db.getPresencas();
        presencasData = local
          .filter(p => p.AlunoId === alunoId && (!date || p.date === date))
          .map(mapDbPresencaToPresenca);
      }

      setPresencas(presencasData);
    } catch (err) {
      console.error('Erro ao buscar presenças por aluno:', err);
      setErro('Não foi possível carregar as presenças.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const buscarPresencasSemFiltro = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setCarregando(true);
    setErro(null);

    try {
      let presencasData: Presenca[] = [];

      if (isOnline) {
        try {
          const resp = await requestRef.current<Presenca[]>(`${API_URL}/api/presencas`);
          if (resp && Array.isArray(resp)) {
            presencasData = resp.map(p => ({
              id: p.id,
              AlunoId: p.AlunoId,
              date: p.date,
              present: p.present,
              observacao: p.observacao,
              synced: true,
              lastSync: p.lastSync,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            }));
            await db.savePresencas(presencasData);
          }
        } catch (err) {
          console.warn('API presencas falhou, usando local', err);
        }
      }

      if (presencasData.length === 0) {
        const local = await db.getPresencas();
        presencasData = local.map(mapDbPresencaToPresenca);
      }

      setPresencas(presencasData);
    } catch (err) {
      console.error('Erro ao buscar presenças:', err);
      setErro('Não foi possível carregar as presenças.');
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  // --- registrar presença (local-first) ---
  const registrarPresenca = useCallback(async (alunoId: number, presente: boolean, observacao?: string) => {
    const db = dbRef.current;
    if (!db) return false;

    const now = new Date().toISOString();
    const novaPresenca: Presenca = {
      AlunoId: alunoId,
      date: dataSelecionada,
      present: presente,
      observacao: observacao ?? '',
      createdAt: now,
      updatedAt: now,
      synced: isOnline // mark true only if we can persist synced state meaningfully; we'll update later if we actually send
    };

    try {
      setCarregando(true);
      await db.savePresenca(novaPresenca);

      // Update UI from local DB for stable truth
      const local = await db.getPresencas();
      setPresencas(local.map(mapDbPresencaToPresenca));

      // If online, try immediate network post (best-effort)
      if (isOnline) {
        try {
          const resp = await requestRef.current(`${API_URL}/api/presencas`, {
            method: 'POST',
            body: JSON.stringify(novaPresenca)
          });
          if (resp && resp.id) {
            // set as synced in local DB
            await db.updatePresencaSyncStatus(resp.id, true);
            // reload local presencas
            const reloaded = await db.getPresencas();
            setPresencas(reloaded.map(mapDbPresencaToPresenca));
          }
        } catch (err) {
          console.warn('Não foi possível enviar presença agora — ficará pendente para próxima sincronização', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao salvar presença localmente:', err);
      setErro('Erro ao registrar presença.');
      return false;
    } finally {
      setCarregando(false);
    }
  }, [dataSelecionada, isOnline]);

  // --- selectors / UI helpers ---
  const selecionarEscola = useCallback(async (escola: Escola | null) => {
    setEscolaSelecionada(escola);
    setTurmaSelecionada(null);
    if (escola && escola.id !== undefined && escola.id !== null) {
      await buscarTurmasByEscolaId(escola.id);
    }
  }, [buscarTurmasByEscolaId]);

  const selecionarTurma = useCallback(async (turma: Turma | null) => {
    setTurmaSelecionada(turma);
    if (turma && turma.id !== undefined && turma.id !== null) {
      await buscarAlunosByTurmaId(turma.id);
    }
  }, [buscarAlunosByTurmaId]);

  const alterarData = useCallback((data: string) => {
    setDataSelecionada(data);
  }, []);

  const alterarAluno = useCallback(async (aluno: Aluno) => {
    setAlunos(prev => prev.map(a => a.id === aluno.id ? aluno : a));
  }, []);

  // Expose context value (memoized)
  const contextValue = useMemo(() => ({
    escolas,
    turmas,
    alunos,
    presencas,
    escolaSelecionada,
    turmaSelecionada,
    dataSelecionada,
    carregando,
    erro,
    buscarEscolas,
    selecionarEscola,
    buscarTurmas,
    selecionarTurma,
    buscarAlunos,
    buscarPresencasPorAluno,
    buscarPresencasSemFiltro,
    registrarPresenca,
    alterarData,
    alterarAluno,
    buscarTurmasByEscolaId,
    buscarAlunosByTurmaId,
    isOnline,
    sincronizar,
    syncStatus
  }), [
    escolas,
    turmas,
    alunos,
    presencas,
    escolaSelecionada,
    turmaSelecionada,
    dataSelecionada,
    carregando,
    erro,
    buscarEscolas,
    selecionarEscola,
    buscarTurmas,
    selecionarTurma,
    buscarAlunos,
    buscarPresencasPorAluno,
    buscarPresencasSemFiltro,
    registrarPresenca,
    alterarData,
    alterarAluno,
    buscarTurmasByEscolaId,
    buscarAlunosByTurmaId,
    isOnline,
    sincronizar,
    syncStatus
  ]);

  return (
    <PresencaContext.Provider value={contextValue}>
      {children}
    </PresencaContext.Provider>
  );
};

export const usePresenca = () => {
  const context = useContext(PresencaContext);
  if (!context) {
    throw new Error('usePresenca deve ser usado dentro de um PresencaProvider');
  }
  return context;
};

export default PresencaContext;
