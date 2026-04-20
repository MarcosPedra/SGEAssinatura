// Payload recebido do Blazor quando uma retirada de encomenda é solicitada
export interface WithdrawalPayload {
  type: 'withdrawal';
  purchaseId: number;
  recipientName: string;
  trackingCodes: string[];   // pode ter mais de uma encomenda na retirada
  note?: string;
  sessionId: string;         // sessionId efêmero do frontend — deve ser ecoado de volta em SignatureResult
}

// Payload recebido do Blazor quando um lote de transportadora precisa de assinatura
export interface BatchReceiptPayload {
  type: 'batchReceipt';
  batchReceiptId: number;
  delivererName: string;
  carrier: string;
  quantity: number;
  trackingCodeBatch: string;
  sessionId: string;         // sessionId efêmero do frontend
}

export type SignaturePayload = WithdrawalPayload | BatchReceiptPayload;

// Payload enviado de volta ao Blazor após assinatura
export interface SignatureResult {
  type: 'withdrawal' | 'batchReceipt';
  referenceId: number;       // purchaseId ou batchReceiptId
  signatureBase64: string;   // data:image/png;base64,...
  sessionId: string;         // ecoado do payload — permite o hub rotear ao frontend correto
}
