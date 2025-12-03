// app/components/Camera.tsx
import React, { useEffect, useRef, useState } from 'react';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { usePresenca } from '../contexts/PresencaContext';

const Camera: React.FC = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const videoRef = useRef<any>(null);

  const { registrarPresenca, turmaSelecionada } = usePresenca();

  // Função para reconhecer aluno (simulada)
  const reconhecerAluno = async () => {
    if (!turmaSelecionada) return;
    
    // Aqui você implementaria a lógica de reconhecimento facial
    // Por enquanto, vamos simular o reconhecimento do aluno com ID 1
    const alunoId = 1;
    await registrarPresenca(alunoId, true);
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      (async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
              width: { min: 640, ideal: 1920, max: 1920 },
              height: { min: 480, ideal: 1080, max: 1080 },
              frameRate: { ideal: 60, max: 60 },
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (error) {
          console.error('Erro ao acessar a câmera:', error);
        }
      })();
    }
  }, [facing]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Precisamos da sua permissão para acessar a câmera</Text>
        <button onClick={requestPermission}>Permitir câmera</button>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={styles.cameraWeb}
          onClick={reconhecerAluno}
        />
        <button 
          onClick={() => setFacing(facing === 'back' ? 'front' : 'back')}
          style={styles.botaoAlternar}
        >
          Alternar Câmera
        </button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onCameraReady={() => {
          console.log('Câmera pronta');
        }}
        style={styles.camera}
        onTouchEnd={reconhecerAluno}
      />
      <button 
        onClick={() => setFacing(facing === 'back' ? 'front' : 'back')}
        style={styles.botaoAlternar}
      >
        Alternar Câmera
      </button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 20,
    alignItems: 'center'
  },
  message: {
    textAlign: 'center',
    marginBottom: 10,
  },
  camera: {
    width: '100%',
    height: 300,
    backgroundColor: 'black',
    borderColor: 'blue',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  cameraWeb: {
    width: '100%',
    maxWidth: 640,
    height: 'auto',
    maxHeight: 480,
    borderColor: 'blue',
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: 'black',
  },
  botaoAlternar: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#4a90e2',
    color: 'white',
    borderWidth: 0,
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
  },
});

export default Camera;