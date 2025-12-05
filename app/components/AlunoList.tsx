// app/components/AlunoList.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';

const AlunoList: React.FC = () => {
  const { 
    alunos,
    turmaSelecionada, 
    registrarPresenca,
    dataSelecionada,
    alterarAluno
  } = usePresenca();
  
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});

  // Initialize observacoes with existing data
  useEffect(() => {
    const initialObservations = alunos.reduce((acc, aluno) => {
      const presenca = aluno.Presencas?.find(p => p.date === dataSelecionada);
      if (presenca?.observacao) {
        acc[aluno.id!] = presenca.observacao;
      }
      return acc;
    }, {} as Record<number, string>);
    
    setObservacoes(prev => ({
      ...prev,
      ...initialObservations
    }));
  }, [alunos, dataSelecionada]);
  
  if (!turmaSelecionada) return null;

  const handleTogglePresenca = async (alunoId: number, present: boolean) => {
    try {
      setAtualizando(true);
      const observacao = observacoes[alunoId] || '';
      await registrarPresenca(alunoId, !present, observacao);
    } finally {
      setAtualizando(false);
      const aluno = alunos.find(a => a.id === alunoId)!;
      const presenca = aluno.Presencas?.find(p => p.date === dataSelecionada);
      if (presenca) {
        presenca.present = !present;
        presenca.observacao = observacoes[alunoId] || '';
      } else {
        aluno.Presencas?.push({
          AlunoId: alunoId,
          date: dataSelecionada,
          present: !present,
          observacao: observacoes[alunoId] || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false
        });
      }
      console.log({
        aluno
      })
      alterarAluno(aluno);
    }
  };

  const handleObservacaoChange = (alunoId: number, text: string) => {
    setObservacoes(prev => ({
      ...prev,
      [alunoId]: text
    }));
  };

  return (
    <ScrollView>
    <View style={styles.container}>
      <Text style={styles.titulo}>Alunos da Turma {turmaSelecionada.name}:</Text>
      {alunos.map(item => {
        const present = item.Presencas?.some(p => p.date === dataSelecionada && p.present) ?? false;
        return (
          <View
            key={String(item.id)}
            style={[
              styles.item,
              present ? styles.presente : styles.ausente
            ]}
          >
            <Text style={styles.itemText}>{item.name}</Text>
            <TextInput 
              style={styles.observacao} 
              placeholder="Observação" 
              onChangeText={(text) => handleObservacaoChange(item.id!, text)}
              value={observacoes[item.id!] || ''}
            />
            <TouchableOpacity
              style={[styles.botaoPresenca, atualizando && styles.botaoDesabilitado]}
              onPress={() => !atualizando && handleTogglePresenca(Number(item.id), present)}
              disabled={atualizando}
            >
              <Text style={styles.botaoTexto}>
                {present ? 'Presente' : 'Ausente'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 10,
    marginTop: 10,
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    maxHeight: 300,
    overflow: 'scroll'
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 5,
    marginBottom: 5,
  },
  presente: {
    backgroundColor: '#e6f7e6',
  },
  ausente: {
    backgroundColor: '#ffe6e6',
  },
  itemText: {
    fontSize: 14,
  },
  botaoPresenca: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#4a90e2',
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoTexto: {
    color: 'white',
    fontWeight: 'bold',
  },
  observacao: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: 10,
  },
});

export default AlunoList;