// app/components/EscolaList.tsx
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import Loading from './Loading';
import ErrorDisplay from './ErrorDisplay';

const EscolaList: React.FC = () => {
  const { 
    escolas, 
    carregando, 
    erro, 
    buscarEscolas, 
    selecionarEscola ,
    escolaSelecionada
  } = usePresenca();

  useEffect(() => {
    buscarEscolas();
  }, [buscarEscolas]);

  if (carregando && escolas.length === 0) {
    return <Loading message="Carregando escolas..." />;
  }

  if (erro) {
    return <ErrorDisplay message={erro} onRetry={buscarEscolas} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Selecione uma escola:</Text>
      <FlatList
        data={escolas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, escolaSelecionada?.id === item.id && { 
              backgroundColor: '#e3f2fd',
              pointerEvents: 'none',
            }]}
            onPress={() => selecionarEscola(item)}
            
          >
            <Text style={styles.itemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 10,
    maxHeight: 200,
    marginBottom: 10,
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