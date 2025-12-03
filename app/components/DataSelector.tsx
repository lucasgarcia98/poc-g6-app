// app/components/DataSelector.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';

const DataSelector: React.FC = () => {
  const { dataSelecionada, alterarData } = usePresenca();
  const [data, setData] = useState<string>(dataSelecionada);

  const handleDataChange = (novaData: string) => {
    setData(novaData);
    alterarData(novaData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={data}
          onChange={(e) => handleDataChange(e.target.value)}
          style={styles.dataInputWeb}
        />
      ) : (
        <TextInput
          style={styles.dataInput}
          value={data}
          onChangeText={handleDataChange}
          placeholder="YYYY-MM-DD"
          keyboardType="number-pad"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
    paddingHorizontal: 10,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    flex: 1,
  },
  dataInputWeb: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    flex: 1,
    outlineWidth: 0,
    outlineOffset: 0,
    boxShadow: 'none',
    outlineColor: 'transparent',
  },
});

export default DataSelector;