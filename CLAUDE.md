# SGE Assinatura — CLAUDE.md

Aplicativo React Native (Expo) para coleta de assinaturas digitais em operações do sistema SGE (Gestor de Encomendas). Comunicação em tempo real via SignalR com um backend Blazor.

---

## Estrutura do projeto

```
SGEAssinatura/
├── App.tsx                          # Entry point — alterna entre WaitingScreen e SignaturePad
├── app.json                         # Config Expo (nome, ícones, hubUrl)
├── package.json
├── tsconfig.json
├── babel.config.js
└── src/
    ├── components/
    │   ├── SignaturePad.tsx          # Tela de assinatura com countdown automático
    │   └── WaitingScreen.tsx        # Tela de espera com status da conexão
    ├── hooks/
    │   └── useSignalR.ts            # Conexão SignalR, estado e envio da assinatura
    └── types/
        └── signalr.ts               # Tipos: WithdrawalPayload, BatchReceiptPayload, SignatureResult
```

---

## Stack

| Tecnologia | Versão | Motivo |
|---|---|---|
| Expo SDK | ~54.0.0 | Framework principal |
| React | 19.1.0 | Exigido pelo SDK 54 |
| React Native | 0.81.5 | Exigido pelo SDK 54 |
| @microsoft/signalr | ^8.0.7 | Comunicação em tempo real com o backend Blazor |
| react-native-signature-canvas | ^4.7.2 | Pad de assinatura via WebView |
| react-native-webview | 13.15.0 | Peer dep de signature-canvas |
| TypeScript | ^5.3.3 | Tipagem estrita (`strict: true`) |

---

## Fluxo de funcionamento

1. O app abre e `useSignalR` conecta ao hub SignalR configurado em `app.json > extra.hubUrl`
2. `WaitingScreen` exibe o status da conexão enquanto aguarda
3. O backend Blazor dispara `RequestWithdrawalSignature` ou `RequestBatchSignature`
4. `useSignalR` recebe o payload e o armazena em estado
5. `App.tsx` detecta o payload e renderiza `SignaturePad`
6. O usuário assina; após levantar o dedo, um countdown de 5 segundos inicia envio automático
7. `SignaturePad` chama `onConfirm(result)` → `useSignalR.sendSignature` → invoca `SubmitSignature` no hub
8. O payload é limpo e o app volta para `WaitingScreen`

---

## Tipos de operação (`SignaturePayload`)

| Tipo | Evento SignalR recebido | Campos específicos |
|---|---|---|
| `withdrawal` | `RequestWithdrawalSignature` | `purchaseId`, `recipientName`, `trackingCodes[]`, `note?` |
| `batchReceipt` | `RequestBatchSignature` | `batchReceiptId`, `delivererName`, `carrier`, `quantity`, `trackingCodeBatch` |

O campo `referenceId` em `SignatureResult` recebe `purchaseId` ou `batchReceiptId` conforme o tipo.

---

## Configuração necessária

### URL do hub SignalR
Em `app.json`, substitua o placeholder pelo endereço real do servidor:
```json
"extra": {
  "hubUrl": "https://SEU-SERVIDOR/hubs/signature"
}
```
O hook `useSignalR` lê esse valor via `Constants.expoConfig?.extra?.hubUrl`.

### Instalação de dependências
```bash
npm install --legacy-peer-deps
```
O flag `--legacy-peer-deps` é necessário porque o npm v8+ tem resolvedor de peer deps mais estrito que conflita com as dependências do Expo.

---

## Decisões e correções já aplicadas

### Entry point — sem expo-router
O `package.json` usava `"main": "expo-router/entry"` e `app.json` tinha `"plugins": ["expo-router"]`, mas o projeto não tem diretório `app/` e é de tela única. Corrigido para `"main": "expo/AppEntry"` e plugin removido.

### Type guard para `SignaturePayload`
`SignaturePayload` é uma union discriminada (`WithdrawalPayload | BatchReceiptPayload`). Usar uma variável `boolean` não estreita o tipo no TypeScript — a solução foi criar uma função type guard em `SignaturePad.tsx`:
```typescript
function isWithdrawal(p: SignaturePayload): p is WithdrawalPayload {
  return p.type === 'withdrawal';
}
```
Todos os acessos a campos específicos da union usam `isWithdrawal(payload)` como condição.

### Upgrade SDK 52 → SDK 54
Realizado via `npx expo install --fix` + correção manual de `@types/react` para `~19.1.10`. O SDK 54 migrou para **React 19** — os `useRef` do projeto já estavam corretos (todos com valor inicial `null`).

---

## Reconexão SignalR

`withAutomaticReconnect([0, 2000, 5000, 10000, 30000])` só atua após uma conexão inicial bem-sucedida. Se a conexão inicial falhar, o status fica `disconnected` e não há retry automático — o usuário precisa reiniciar o app. Para adicionar retry na conexão inicial, seria necessário implementar um loop com backoff em `useSignalR.ts`.

---

## Comandos úteis

```bash
# Iniciar Metro
npx expo start

# Android
npx expo start --android

# Verificar versões compatíveis com o SDK instalado
npx expo install --fix --check
```
