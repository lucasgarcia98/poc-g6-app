// app/components/Sincronizar.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';
import { MaterialIcons } from '@expo/vector-icons';

const Sincronizar = () => {
  const { isOnline, sincronizar, carregando } = usePresenca();

  const handleSync = async () => {
    if (!isOnline) {
      alert('Você está offline. Conecte-se à internet para sincronizar.');
      return;
    }
    await sincronizar();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isOnline && styles.buttonOffline]}
        onPress={handleSync}
        disabled={!isOnline || carregando}
      >
        <MaterialIcons 
          name="sync" 
          size={24} 
          color={isOnline ? "#fff" : "#999"} 
          style={styles.icon} 
        />
        <Text style={[styles.text, !isOnline && styles.textOffline]}>
          {carregando ? 'Sincronizando...' : 'Sincronizar Dados'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonOffline: {
    backgroundColor: '#e0e0e0',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  textOffline: {
    color: '#999',
  },
});

export default Sincronizar;