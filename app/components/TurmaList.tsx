// app/components/TurmaList.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import Loading from './Loading';
import ErrorDisplay from './ErrorDisplay';

const TurmaList: React.FC = () => {
  const { 
    turmas, 
    carregando, 
    erro, 
    escolaSelecionada, 
    selecionarTurma,
    buscarTurmasByEscolaId,
    turmaSelecionada
  } = usePresenca();

  if (!escolaSelecionada) return null;

  if (carregando && turmas.length === 0) {
    return <Loading message="Carregando turmas..." />;
  }

  if (erro) {
    return <ErrorDisplay message={erro} onRetry={() => escolaSelecionada?.id && buscarTurmasByEscolaId(escolaSelecionada.id)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Turmas de {escolaSelecionada.name}:</Text>
      <FlatList
        data={turmas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, turmaSelecionada?.id === item.id && { 
              backgroundColor: '#e3f2fd',
              pointerEvents: 'none',
            }]}
            onPress={() => selecionarTurma(item)}
          >
            <Text style={styles.itemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        style={{
          maxHeight: 200
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
    marginBottom: 10,
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  itemText: {
    fontSize: 14,
  },
});

export default TurmaList;