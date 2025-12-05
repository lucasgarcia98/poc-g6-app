// app/components/EscolaList.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import ErrorDisplay from './ErrorDisplay';

const EscolaList: React.FC = () => {
  const { 
    escolas,
    erro, 
    buscarEscolas, 
    selecionarEscola ,
    escolaSelecionada
  } = usePresenca();

  useEffect(() => {
    buscarEscolas();
  }, [buscarEscolas]);

  if (erro) {
    return <ErrorDisplay message={erro} onRetry={buscarEscolas} />;
  }

  return (
    <ScrollView>
    <View style={styles.container}>
      <Text style={styles.titulo}>Selecione uma escola:</Text>
      {escolas.map(item => (
        <TouchableOpacity
          key={String(item.id)}
          style={[styles.item, escolaSelecionada?.id === item.id && { 
            backgroundColor: '#e3f2fd',
            pointerEvents: 'none',
          }]}
          onPress={() => selecionarEscola(item)}
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
    marginBottom: 10,
    maxHeight: 300,
    overflow: 'scroll'
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
  },
});

export default EscolaList;