import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SignaturePayload, SignatureResult } from '../types/signalr';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UseSignalRReturn {
  status: ConnectionStatus;
  payload: SignaturePayload | null;
  sendSignature: (result: SignatureResult) => Promise<void>;
  clearPayload: () => void;
}

const HUB_URL: string =
  Constants.expoConfig?.extra?.hubUrl ?? 'https://localhost:7001/hubs/signature';

export function useSignalR(): UseSignalRReturn {
  const connectionRef = useRef<HubConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [payload, setPayload] = useState<SignaturePayload | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Evento disparado pelo Blazor para retirada de encomenda
    connection.on('RequestWithdrawalSignature', (data: SignaturePayload) => {
      setPayload({ ...data, type: 'withdrawal' });
    });

    // Evento disparado pelo Blazor para recebimento de lote
    connection.on('RequestBatchSignature', (data: SignaturePayload) => {
      setPayload({ ...data, type: 'batchReceipt' });
    });

    connection.onreconnecting(() => setStatus('reconnecting'));
    connection.onreconnected(() => setStatus('connected'));
    connection.onclose(() => setStatus('disconnected'));

    connection
      .start()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('disconnected'));

    return () => {
      connection.stop();
    };
  }, []);

  const sendSignature = useCallback(async (result: SignatureResult) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== HubConnectionState.Connected) return;
    await conn.invoke('SubmitSignature', result);
  }, []);

  const clearPayload = useCallback(() => setPayload(null), []);

  return { status, payload, sendSignature, clearPayload };
}
