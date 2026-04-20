import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SignaturePad } from './src/components/SignaturePad';
import { WaitingScreen } from './src/components/WaitingScreen';
import { useSignalR } from './src/hooks/useSignalR';
import { SignatureResult } from './src/types/signalr';

export default function App() {
  const { status, payload, sendSignature, clearPayload } = useSignalR();

  const handleConfirm = async (result: SignatureResult) => {
    await sendSignature(result);
    clearPayload();
    Alert.alert('Concluído', 'Assinatura enviada com sucesso.');
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar',
      'Deseja cancelar esta operação?',
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', style: 'destructive', onPress: clearPayload },
      ]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" backgroundColor="#1565C0" />
        {payload ? (
          <SignaturePad
            payload={payload}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        ) : (
          <WaitingScreen status={status} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1565C0',
  },
});
