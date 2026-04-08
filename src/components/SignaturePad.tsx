import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { SignaturePayload, SignatureResult, WithdrawalPayload } from '../types/signalr';

function isWithdrawal(p: SignaturePayload): p is WithdrawalPayload {
  return p.type === 'withdrawal';
}

interface SignaturePadProps {
  payload: SignaturePayload;
  onConfirm: (result: SignatureResult) => Promise<void>;
  onCancel: () => void;
}

const WEBSTYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { background: #FAFAFA; margin: 0; padding: 0; }
`;

// Segundos de inatividade antes do envio automático
const AUTO_CONFIRM_SECONDS = 5;

export function SignaturePad({ payload, onConfirm, onCancel }: SignaturePadProps) {
  const sigRef = useRef<SignatureViewRef>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Limpa o timer ao desmontar ou ao limpar a assinatura
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Inicia o countdown — chamado no onEnd (usuário levantou o dedo)
  const startTimer = useCallback(() => {
    clearTimer();
    setCountdown(AUTO_CONFIRM_SECONDS);

    let remaining = AUTO_CONFIRM_SECONDS;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearTimer();
        // Dispara readSignature automaticamente — o onOK receberá o base64
        sigRef.current?.readSignature();
      }
    }, 1000);
  }, [clearTimer]);

  // Garante limpeza ao desmontar
  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleOK = async (base64: string) => {
    if (!base64 || base64.trim() === '') return;

    clearTimer();
    setSaving(true);

    try {
      const result: SignatureResult = {
        type: payload.type,
        referenceId: isWithdrawal(payload) ? payload.purchaseId : payload.batchReceiptId,
        signatureBase64: base64,
      };
      await onConfirm(result);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a assinatura. Tente novamente.');
      setSaving(false);
    }
  };

  const handleEmpty = () => {
    Alert.alert('Atenção', 'Por favor, assine antes de confirmar.');
  };

  // Confirmar manual — cancela o timer e dispara imediatamente
  const handleConfirm = () => {
    if (!signed) {
      Alert.alert('Atenção', 'Por favor, assine antes de confirmar.');
      return;
    }
    clearTimer();
    sigRef.current?.readSignature();
  };

  const handleClear = () => {
    clearTimer();
    sigRef.current?.clearSignature();
    setSigned(false);
  };

  // Cada vez que o usuário levanta o dedo inicia (ou reinicia) o timer
  const handleEnd = () => {
    setSigned(true);
    startTimer();
  };

  // Se o usuário toca no pad novamente enquanto o timer corre, reseta
  const handleBegin = () => {
    if (timerRef.current) clearTimer();
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          {isWithdrawal(payload) ? 'RETIRADA DE ENCOMENDA' : 'RECEBIMENTO DE LOTE'}
        </Text>
      </View>

      {/* Informações da operação */}
      <ScrollView
        style={styles.infoScroll}
        contentContainerStyle={styles.infoContent}
        showsVerticalScrollIndicator={false}
      >
        {isWithdrawal(payload) ? (
          <>
            <InfoRow label="Condômino" value={payload.recipientName} />
            <InfoRow
              label={payload.trackingCodes.length > 1 ? 'Códigos de rastreio' : 'Código de rastreio'}
              value={payload.trackingCodes.join('\n') || '—'}
            />
            {payload.note ? <InfoRow label="Observação" value={payload.note} /> : null}
          </>
        ) : (
          <>
            <InfoRow label="Entregador" value={payload.delivererName} />
            <InfoRow label="Transportadora" value={payload.carrier} />
            <InfoRow label="Quantidade" value={String(payload.quantity)} />
            <InfoRow label="Lote" value={payload.trackingCodeBatch || '—'} />
          </>
        )}
      </ScrollView>

      {/* Pad de assinatura */}
      <View style={styles.padWrapper}>
        <Text style={styles.padLabel}>
          {countdown !== null
            ? `Enviando automaticamente em ${countdown}s — ou toque para continuar`
            : 'Assine abaixo'}
        </Text>
        <View style={[
          styles.padContainer,
          countdown !== null && styles.padContainerActive,
        ]}>
          <SignatureScreen
            ref={sigRef}
            onOK={handleOK}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
            onBegin={handleBegin}
            webStyle={WEBSTYLE}
            autoClear={false}
            backgroundColor="#FAFAFA"
            penColor="#1565C0"
          />
        </View>
      </View>

      {/* Botões */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleClear}
          disabled={saving}
        >
          <Text style={styles.buttonSecondaryText}>Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.buttonDangerText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            countdown !== null && styles.buttonPrimaryCountdown,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : countdown !== null ? (
            <Text style={styles.buttonPrimaryText}>Confirmar ({countdown})</Text>
          ) : (
            <Text style={styles.buttonPrimaryText}>Confirmar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  infoScroll: {
    maxHeight: 180,
    backgroundColor: '#FFFFFF',
  },
  infoContent: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: '#212121',
    flex: 2,
    textAlign: 'right',
  },
  padWrapper: {
    flex: 1,
    padding: 16,
  },
  padLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  padContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  padContainerActive: {
    borderColor: '#1565C0',
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#1565C0',
    flex: 2,
  },
  buttonPrimaryCountdown: {
    backgroundColor: '#2E7D32',
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonDanger: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonSecondaryText: {
    color: '#424242',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDangerText: {
    color: '#C62828',
    fontWeight: '600',
    fontSize: 14,
  },
});
