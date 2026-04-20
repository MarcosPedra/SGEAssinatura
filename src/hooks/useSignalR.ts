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
  Constants.expoConfig?.extra?.hubUrl ?? 'http://192.168.0.14:5108/hubs/signature';
const HUB_API_KEY: string =
  Constants.expoConfig?.extra?.hubApiKey ?? '';
const DEVICE_SESSION_ID: string =
  Constants.expoConfig?.extra?.deviceSessionId ?? '';

export function useSignalR(): UseSignalRReturn {
  const connectionRef = useRef<HubConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [payload, setPayload] = useState<SignaturePayload | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${HUB_URL}?apiKey=${encodeURIComponent(HUB_API_KEY)}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Evento disparado pelo Blazor para retirada de encomenda
    connection.on('RequestWithdrawalSignature', (data: SignaturePayload) => {
      console.log('[SGE] RequestWithdrawalSignature recebido:', data);
      setPayload({ ...data, type: 'withdrawal' });
    });

    // Evento disparado pelo Blazor para recebimento de lote
    connection.on('RequestBatchSignature', (data: SignaturePayload) => {
      console.log('[SGE] RequestBatchSignature recebido:', data);
      setPayload({ ...data, type: 'batchReceipt' });
    });

    connection.onreconnecting(() => setStatus('reconnecting'));
    connection.onreconnected(async () => {
      // Grupos SignalR não são preservados após reconexão — é preciso re-entrar
      try { await connection.invoke('JoinAsDevice', DEVICE_SESSION_ID); } catch { /* ignora */ }
      setStatus('connected');
    });
    connection.onclose(() => setStatus('disconnected'));

    connection
      .start()
      .then(async () => {
        console.log('[SGE] Hub conectado. DeviceSessionId:', DEVICE_SESSION_ID);
        await connection.invoke('JoinAsDevice', DEVICE_SESSION_ID);
        console.log('[SGE] JoinAsDevice concluído para:', DEVICE_SESSION_ID);
        setStatus('connected');
      })
      .catch((err) => {
        console.error('[SGE] Falha ao conectar ao hub:', err);
        setStatus('disconnected');
      });

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
