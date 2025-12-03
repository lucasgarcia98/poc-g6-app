// app/components/AlunoList.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import Loading from './Loading';

const AlunoList: React.FC = () => {
  const { 
    alunos,
    carregando, 
    turmaSelecionada, 
    registrarPresenca,
    dataSelecionada,
    alterarAluno
  } = usePresenca();
  
  const [atualizando, setAtualizando] = useState<boolean>(false);
  
  if (!turmaSelecionada) return null;

  const handleTogglePresenca = async (alunoId: number, present: boolean) => {
    try {
      setAtualizando(true);
      await registrarPresenca(alunoId, !present);
    } finally {
      setAtualizando(false);
      const aluno = alunos.find(a => a.id === alunoId)!;
      aluno.Presencas = aluno.Presencas?.map(p => p.date === dataSelecionada ? { ...p, present: !present } : p) ?? [];
      alterarAluno(aluno);
    }
  };

  if (carregando && !turmaSelecionada) {
    return <Loading message="Carregando alunos..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Alunos da Turma {turmaSelecionada.name}:</Text>
      <FlatList
        data={alunos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const present = item.Presencas?.some(p => p.date === dataSelecionada && p.present) ?? false;
          return (
            <View style={[
              styles.item,
              present ? styles.presente : styles.ausente
            ]}>
              <Text style={styles.itemText}>{item.name}</Text>
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
        }}
      />
    </View>
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
    maxHeight: 300
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
});

export default AlunoList;