import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface WaitingScreenProps {
  status: ConnectionStatus;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando...',
  connected: 'Aguardando solicitação de assinatura',
  reconnecting: 'Reconectando...',
  disconnected: 'Desconectado — verifique a rede',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connecting: '#757575',
  connected: '#2E7D32',
  reconnecting: '#F57C00',
  disconnected: '#C62828',
};

export function WaitingScreen({ status }: WaitingScreenProps) {
  const isActive = status === 'connecting' || status === 'reconnecting';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.appName}>SGE</Text>
        <Text style={styles.appSubtitle}>Gestor de Encomendas</Text>

        <View style={styles.divider} />

        {isActive ? (
          <ActivityIndicator size="large" color="#1565C0" style={styles.indicator} />
        ) : (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: STATUS_COLOR[status] },
            ]}
          />
        )}

        <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
          {STATUS_LABEL[status]}
        </Text>

        {status === 'connected' && (
          <Text style={styles.hint}>
            Inicie uma operação no sistema para assinar aqui.
          </Text>
        )}

        {status === 'disconnected' && (
          <Text style={styles.hint}>
            O app reconecta automaticamente quando a rede for restaurada.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
    letterSpacing: 1,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: '#1565C0',
    borderRadius: 2,
    marginVertical: 28,
  },
  indicator: {
    marginBottom: 16,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
