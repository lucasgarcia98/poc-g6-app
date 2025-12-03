// app/contexts/PresencaContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Escola, Turma, Aluno, Presenca, PresencaContextData } from '../types';
import { useApi } from '../hooks/useApi';
import { AlunoDB, Database, initDatabase } from '../lib/database';
import NetInfo from '@react-native-community/netinfo';
import { SyncService } from '../services/syncService';

const PresencaContext = createContext<PresencaContextData>({} as PresencaContextData);

interface PresencaProviderProps {
  children: React.ReactNode;
}

export const PresencaProvider: React.FC<PresencaProviderProps> = ({ children }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState<Escola | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; lastSync?: Date; error?: string }>({ 
  loading: false 
});
  const { request } = useApi();
  const API_BASE_URL = 'http://localhost:3002';

  // Monitora o status da conexão
  useEffect(() => {
    console.log('entrou aqui')
    let isMounted = true;
    
    const updateOnlineStatus = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
        // Navegador
        const handleOnline = () => isMounted && setIsOnline(true);
        const handleOffline = () => isMounted && setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } else {
        // React Native
        const unsubscribe = NetInfo.addEventListener(state => {
          if (isMounted) {
            setIsOnline(state.isConnected ?? false);
          }
        });
        
        return () => unsubscribe();
      }
    };

    const init = async () => {
      console.log('entrou aqui')
      try {
        const database = await initDatabase();
        setDb(database);
        console.log({
          database,
          isOnline
        })
        // Após inicializar o banco, carrega os dados iniciais se estiver online
        if (isOnline) {
          await carregarDadosIniciais({
            db: database
          });
        }
      } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
        setErro('Falha ao inicializar o armazenamento local');
      }
    };
    
    init();
    
    const cleanup = updateOnlineStatus();
    
    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const syncService = useMemo(() => {
    if (!db) return null;
    return new SyncService(db, request);
  }, [db, request]);

  const sincronizar = useCallback(async () => {
    if (!syncService || !isOnline) {
      setSyncStatus({ 
        loading: false, 
        error: 'Sem conexão com a internet' 
      });
      return;
    }

    setEscolaSelecionada(null)
    setTurmaSelecionada(null)
    setSyncStatus({ loading: true });
    try {
      // Push local changes
      await syncService.syncAll();
      // Pull latest data
      await syncService.pullLatestData();
      
      setSyncStatus({ 
        loading: false, 
        lastSync: new Date() 
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setSyncStatus({ 
        loading: false, 
        error: `Falha na sincronização: ${errorMessage}` 
      });
      return false;
    }
  }, [syncService, isOnline]);

  // Busca escolas da API ou do banco local
  const buscarEscolas = useCallback(async (db?: Database) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);

    try {
      let escolasData: Escola[] = [];

      // Tenta buscar da API se estiver online
      if (isOnline) {
        try {
          const response = await request<Escola[]>(`${API_BASE_URL}/api/escolas`);
          if (response) {
            escolasData = response;
            // Salva localmente
            await db.saveEscolas(escolasData);
          }
        } catch (error) {
          console.error('Erro ao buscar escolas da API:', error);
          // Continua para tentar carregar do banco local
        }
      }

      // Se não conseguiu buscar da API ou está offline, tenta do banco local
      if (escolasData.length === 0) {
        const localEscolas = await db.getEscolas();
        escolasData = localEscolas.map(e => ({
          id: e.id!,
          name: e.name,
          address: e.address,
          synced: true,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt
        }));
      }

      setEscolas(escolasData);
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
      setErro('Não foi possível carregar as escolas. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);

  const buscarTurmas = useCallback(async (db?: Database) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let turmasData: Turma[] = [];
      
      if (isOnline) {
        try {
          const response = await request<Turma[]>(`${API_BASE_URL}/api/turmas`);
          if (response) {
            turmasData = response;
            // Convert Turma to TurmaDB before saving
            const turmasDB = response.map(t => ({
              id: t.id,
              name: t.name,
              EscolaId: t.EscolaId,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt
            }));
            await db.saveTurmas(turmasDB);
          }
        } catch (error) {
          console.error('Erro ao buscar turmas da API:', error);
          // Continua para tentar carregar do banco local
        }
      }
      
      // Se não conseguiu buscar da API ou está offline, tenta do banco local
      if (turmasData.length === 0) {
        const localTurmas = await db.getTurmas();
        turmasData = localTurmas.map(t => ({
          id: t.id!,
          name: t.name,
          EscolaId: t.EscolaId!,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          synced: true
        }));
      }
      
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      setErro('Não foi possível carregar as turmas. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]); 
  
  // Função para buscar turmas
  const buscarTurmasByEscolaId = useCallback(async (escolaId: number) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let turmasData: Turma[] = [];
      
      if (isOnline) {
        try {
          const response = await request<Turma[]>(`${API_BASE_URL}/api/escolas/${escolaId}/turmas`);
          if (response) {
            turmasData = response;
            // Convert Turma to TurmaDB before saving
            const turmasDB = response.map(t => ({
              id: t.id,
              name: t.name,
              EscolaId: t.EscolaId,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt
            }));
            await db.saveTurmas(turmasDB);
          }
        } catch (error) {
          console.error('Erro ao buscar turmas da API:', error);
        }
      }
      
      if (turmasData.length === 0) {
        const localTurmas = await db.getTurmas(escolaId);
        turmasData = localTurmas.map(t => ({
          id: t.id!,
          name: t.name,
          EscolaId: t.EscolaId!,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          synced: true
        }));
      }
      
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      setErro('Não foi possível carregar as turmas. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);

  const buscarAlunos = useCallback(async (db?: Database) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let alunosData: Aluno[] = [];
      
      if (isOnline) {
        try {
          const response = await request<Aluno[]>(`${API_BASE_URL}/api/alunos`);
          if (response) {
            alunosData = response;
            // Convert Aluno to AlunoDB before saving
            const alunosDB: AlunoDB[] = alunosData.map(a => ({
              id: a.id,
              name: a.name,
              TurmaId: a.TurmaId!,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              Presencas: a.Presencas ?? [],
              synced: true
            }));
            await db.saveAlunos(alunosDB);
          }
        } catch (error) {
          console.error('Erro ao buscar alunos da API:', error);
        }
      }
      
      if (alunosData.length === 0) {
        const localAlunos = await db.getAlunos();
        alunosData = localAlunos.map(a => ({
          id: a.id!,
          name: a.name,
          TurmaId: a.TurmaId!,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          synced: true,
          Presencas: a.Presencas ?? []
        }));
      }
      
      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      setErro('Não foi possível carregar os alunos. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);
  
  // Função para buscar alunos
  const buscarAlunosByTurmaId = useCallback(async (turmaId: number) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let alunosData: Aluno[] = [];
      
      if (isOnline) {
        try {
          const response = await request<Aluno[]>(`${API_BASE_URL}/api/turmas/${turmaId}/alunos`);
          if (response) {
            alunosData = response;
            // Convert Aluno to AlunoDB before saving
            const alunosDB: AlunoDB[] = alunosData.map(a => ({
              id: a.id,
              name: a.name,
              TurmaId: a.TurmaId!,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              synced: true,
              Presencas: a.Presencas ?? []
            }));
            await db.saveAlunos(alunosDB);
          }
        } catch (error) {
          console.error('Erro ao buscar alunos da API:', error);
        }
      }
      
      if (alunosData.length === 0) {
        const localAlunos = await db.getAlunos(turmaId);
        alunosData = localAlunos.map(a => ({
          id: a.id!,
          name: a.name,
          TurmaId: a.TurmaId!,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          synced: true,
          Presencas: a.Presencas ?? []
        }));
      }

      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      setErro('Não foi possível carregar os alunos. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);

  // Função para carregar todos os dados iniciais
  const carregarDadosIniciais = useCallback(async ({db}: { db: Database}) => {
    console.log('entrou aqui1')
    if (!db) return;
    console.log('entrou aqui2')
    try {
      setCarregando(true);
      setErro(null);
      
      await buscarEscolas(db);
      await buscarTurmas(db);
      await buscarAlunos(db);
      
      console.log('Dados iniciais carregados com sucesso');
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setErro('Não foi possível carregar todos os dados iniciais');
    } finally {
      setCarregando(false);
    }
  }, [db, buscarEscolas, buscarTurmas, buscarAlunos, escolas, turmas]);

  // Monitora o status da conexão
  useEffect(() => {
    let isMounted = true;
    
    const updateOnlineStatus = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
        // Navegador
        const handleOnline = () => isMounted && setIsOnline(true);
        const handleOffline = () => isMounted && setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Sincroniza quando voltar a ficar online
        const handleOnlineWithSync = async () => {
          if (isMounted) {
            setIsOnline(true);
            await sincronizar();
          }
        };
        
        window.addEventListener('online', handleOnlineWithSync);
        
        // Define o estado inicial
        setIsOnline(navigator.onLine);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnlineWithSync);
        };
      } else {
        // React Native
        const unsubscribe = NetInfo.addEventListener(state => {
          if (isMounted) {
            const isConnected = state.isConnected ?? false;
            setIsOnline(isConnected);
            
            // Sincroniza quando voltar a ficar online
            if (isConnected) {
              sincronizar();
            }
          }
        });
        
        // Verifica o estado inicial
        NetInfo.fetch().then(state => {
          if (isMounted) {
            setIsOnline(state.isConnected ?? false);
          }
        });
        
        return () => unsubscribe();
      }
    };
    
    const cleanup = updateOnlineStatus();
    
    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [sincronizar, isOnline]);

  // Função para buscar presenças por aluno
  const buscarPresencasPorAluno = useCallback(async (alunoId: number, date?: string) => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let presencasData: Presenca[] = [];
      let url = `${API_BASE_URL}/api/alunos/${alunoId}/presencas`;
      
      // Adiciona parâmetros de data se fornecidos
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      if (isOnline) {
        try {
          const response = await request<Presenca[]>(url);
          if (response) {
            presencasData = response.map(p => ({
              id: p.id,
              AlunoId: p.AlunoId,
              date: p.date,
              present: p.present,
              synced: true,
              lastSync: p.lastSync,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            }));
            console.log('Presenças da API:', response);
            await db.savePresencas(presencasData);
          }
        } catch (error) {
          console.error('Erro ao buscar presenças da API:', error);
        }
      }
      
      // Se não encontrou online ou está offline, busca do banco local
      if (presencasData.length === 0) {
        const localPresencas = await db.getPresencas();
        presencasData = localPresencas
          .filter(p => p.AlunoId === alunoId && (!date || p.date === date))
          .map(p => ({
            id: p.id!,
            AlunoId: p.AlunoId!,
            date: p.date,
            present: p.present,
            synced: true,
            lastSync: p.lastSync,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }));
      }
      
      setPresencas(presencasData);
    } catch (error) {
      console.error('Erro ao buscar presenças:', error);
      setErro('Não foi possível carregar as presenças. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);


  // Função para buscar todas as presenças sem filtro
  const buscarPresencasSemFiltro = useCallback(async () => {
    if (!db) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      let presencasData: Presenca[] = [];
      
      if (isOnline) {
        try {
          const response = await request<Presenca[]>(`${API_BASE_URL}/api/presencas`);
          if (response) {
            presencasData = response.map(p => ({
              id: p.id,
              AlunoId: p.AlunoId,
              date: p.date,
              present: p.present,
              synced: true,
              lastSync: p.lastSync,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            }));
            await db.savePresencas(presencasData);
          }
        } catch (error) {
          console.error('Erro ao buscar presenças da API:', error);
        }
      }
      
      // Se não encontrou online ou está offline, busca do banco local
      if (presencasData.length === 0) {
        const localPresencas = await db.getPresencas();
        presencasData = localPresencas.map(p => ({
          id: p.id!,
          AlunoId: p.AlunoId!,
          date: p.date,
          present: p.present,
          synced: true,
          lastSync: p.lastSync,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));
      }
      
      setPresencas(presencasData);
    } catch (error) {
      console.error('Erro ao buscar presenças:', error);
      setErro('Não foi possível carregar as presenças. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [db, isOnline, request]);

  // Função para registrar presença
  const registrarPresenca = useCallback(async (alunoId: number, presente: boolean) => {
  if (!db) return false;

  const now = new Date().toISOString();
  const novaPresenca: Presenca = {
    AlunoId: alunoId,
    date: dataSelecionada,
    present: presente,
    createdAt: now,
    updatedAt: now,
    synced: !isOnline // Se estiver offline, marca como não sincronizado
  };

  try {
    // Salva localmente primeiro
    await db.savePresenca(novaPresenca);
    
    // Atualiza o estado local
    const presencasAtualizadas = await db.getPresencas();
    setPresencas(presencasAtualizadas.map(p => ({
      id: p.id!,
      AlunoId: p.AlunoId!,
      date: p.date,
      present: p.present,
      synced: false,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })));

    // Se estiver online, tenta sincronizar
    if (isOnline) {
      try {
        await request(`${API_BASE_URL}/api/presencas`, {
          method: 'POST',
          body: JSON.stringify(novaPresenca)
        });
        // Atualiza como sincronizado no banco local
        await db.updatePresencaSyncStatus(novaPresenca.id!, true);
      } catch (error) {
        console.error('Erro ao sincronizar presença:', error);
        // Não precisa fazer nada, a sincronização será tentada novamente depois
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar presença localmente:', error);
    return false;
  }
}, [db, dataSelecionada, isOnline, request]);

//   const sincronizarPresencasPendentes = useCallback(async () => {
//   if (!db || !isOnline) return;

//   try {
//     const presencasPendentes = await db.getPresencasPendentes();
    
//     for (const presenca of presencasPendentes) {
//       try {
//         await request(`${API_BASE_URL}/api/presencas`, {
//           method: 'POST',
//           body: JSON.stringify(presenca)
//         });
//         // Atualiza como sincronizado no banco local
//         await db.updatePresencaSyncStatus(presenca.id!, true);
//       } catch (error) {
//         console.error(`Erro ao sincronizar presença ${presenca.id}:`, error);
//         // Continua tentando as próximas presenças mesmo se uma falhar
//       }
//     }
//   } catch (error) {
//     console.error('Erro ao buscar presenças pendentes:', error);
//   }
// }, [db, isOnline, request]);

// useEffect(() => {
//   if (isOnline) {
//     sincronizarPresencasPendentes();
//   }
// }, [isOnline, sincronizarPresencasPendentes]);

  // Função para selecionar escola
  const selecionarEscola = useCallback(async (escola: Escola) => {
    setEscolaSelecionada(escola);
    setTurmaSelecionada(null);
    if (escola.id !== undefined && escola.id !== null) {
      await buscarTurmasByEscolaId(escola.id);
    }
  }, [buscarTurmas]);

  // Função para selecionar turma
  const selecionarTurma = useCallback(async (turma: Turma) => {
    setTurmaSelecionada(turma);
    if (turma.id !== undefined && turma.id !== null) {
      await buscarAlunosByTurmaId(turma.id);
    }
  }, [buscarAlunos]);

  // Função para alterar a data selecionada
  const alterarData = useCallback((data: string) => {
    setDataSelecionada(data);
  }, []);

  // Efeito para carregar as escolas quando o banco estiver pronto
  useEffect(() => {
    if (db) {
      buscarEscolas();
    }
  }, [db, buscarEscolas]);

  // Alterar aluno
  const alterarAluno = useCallback(async (aluno: Aluno) => {
    setAlunos(alunos.map(a => a.id === aluno.id ? aluno : a));
  }, [alunos]);
  
  return (
    <PresencaContext.Provider
      value={{
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
        registrarPresenca: async (alunoId: number, presente: boolean) => {
          await registrarPresenca(alunoId, presente);
        },
        alterarData,
        alterarAluno,
        buscarTurmasByEscolaId,
        buscarAlunosByTurmaId,
        isOnline,
        sincronizar,
        syncStatus
      }}
    >
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