import React, { StrictMode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, ScrollView, View, ActivityIndicator } from 'react-native';
import { PresencaProvider, usePresenca } from './contexts/PresencaContext';
import EscolaList from './components/EscolaList';
import TurmaList from './components/TurmaList';
import AlunoList from './components/AlunoList';
import DataSelector from './components/DataSelector';
import Sincronizar from './components/Sincronizar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const AppContent: React.FC = () => {
  const { carregando, isOnline, pendingPresencas } = usePresenca();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.scroll}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.titulo}>Controle de Frequência Escolar</Text>
            <Sincronizar />
            <DataSelector />
            {/* <Camera /> */}
            <EscolaList />
            <TurmaList />
            <AlunoList />
            <StatusBar style="auto" />
          </ScrollView>

          {carregando && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#4a90e2" />
            </View>
          )}

          {/* Indicador de status de conexão */}
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? '#4caf50' : '#f44336' }
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline
                ? 'Online'
                : pendingPresencas > 0
                  ? `Offline - ${pendingPresencas} pendente(s)`
                  : 'Offline'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <StrictMode>
    <PresencaProvider>
      <AppContent />
    </PresencaProvider>
    </StrictMode>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff'
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  }
});