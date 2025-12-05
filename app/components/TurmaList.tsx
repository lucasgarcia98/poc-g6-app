// app/components/TurmaList.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import ErrorDisplay from './ErrorDisplay';

const TurmaList: React.FC = () => {
  const { 
    turmas, 
    erro, 
    escolaSelecionada, 
    selecionarTurma,
    buscarTurmasByEscolaId,
    turmaSelecionada
  } = usePresenca();

  if (!escolaSelecionada) return null;


  if (erro) {
    return <ErrorDisplay message={erro} onRetry={() => escolaSelecionada?.id && buscarTurmasByEscolaId(escolaSelecionada.id)} />;
  }

  return (
    <ScrollView>
    <View style={styles.container}>
      <Text style={styles.titulo}>Turmas de {escolaSelecionada.name}:</Text>
      {turmas.map(item => (
        <TouchableOpacity
          key={String(item.id)}
          style={[styles.item, turmaSelecionada?.id === item.id && { 
            backgroundColor: '#e3f2fd',
            pointerEvents: 'none',
          }]}
          onPress={() => selecionarTurma(item)}
        >
          <Text style={styles.itemText}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    maxHeight: 300,
    overflow: 'scroll'
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