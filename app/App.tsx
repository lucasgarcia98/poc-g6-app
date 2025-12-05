// app/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { PresencaProvider } from './contexts/PresencaContext';
import EscolaList from './components/EscolaList';
import TurmaList from './components/TurmaList';
import AlunoList from './components/AlunoList';
import DataSelector from './components/DataSelector';
import Sincronizar from './components/Sincronizar';
import './polyfills/noAbortNative';

const AppContent: React.FC = () => {
  return (
        <View style={styles.container}>
          <Text style={styles.titulo}>Controle de Frequência Escolar</Text>
          <Sincronizar />
          <DataSelector />
          {/* <Camera /> */}
          <EscolaList />
          <TurmaList />
          <AlunoList />
          <StatusBar style="auto" />
        </View>
  );
};

export default function App() {
  return (
    <PresencaProvider>
      <AppContent />
    </PresencaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
});