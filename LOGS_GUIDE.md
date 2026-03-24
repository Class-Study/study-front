# 🎯 FLUXO DE CHAT COM LOGS - Guia Rápido

## 📊 Passos do Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE ENVIO (ALUNO)                              │
└─────────────────────────────────────────────────────────────────────────────┘

📍 PASSO 0: [useChatMessages] - Carregamento de histórico ao trocar atividade
   └─ Arquivo: src/hooks/useChatMessages.ts
   └─ Log: "PASSO 0: [useChatMessages] Carregando histórico"
   └─ O quê: Busca histórico de mensagens da atividade atual
   └─ Resultado: messages carregadas da API

📍 PASSO 1: [WorkspaceChat.handleSend] - Usuário clica em enviar
   └─ Arquivo: src/pages/workspace/components/WorkspaceChat/WorkspaceChat.tsx
   └─ Log: "📤 [WorkspaceChat.handleSend] Enviando: '...'"
   └─ O quê: Captura conteúdo do textarea
   └─ Resultado: Chama onSendMessage(content)

📍 PASSO 1.5: [StudentWorkspacePage.handleSendMessage] - Intermediário
   └─ Arquivo: src/pages/workspace/StudentWorkspacePage.tsx
   └─ Log: "PASSO 1.5: [StudentWorkspacePage.handleSendMessage] Intermediário"
   └─ O quê: Delega para sendMessageRef.current
   └─ Resultado: sendMessageRef aponta para useChatMessages.sendMessage

📍 PASSO 2: [useChatMessages.sendMessage] - Núcleo de envio
   └─ Arquivo: src/hooks/useChatMessages.ts
   └─ Log: "PASSO 2: [useChatMessages.sendMessage] Enviando mensagem"
   └─ O quê:
      1. Cria mensagem otimista com isOwn: true
      2. Adiciona ao estado → UI renderiza IMEDIATAMENTE
      3. Envia via WebRTC
      4. Persiste no banco (API)
   └─ Sub-passos:
      - "✅ Mensagem otimista criada: {ID}"
      - "📊 Estado anterior: X mensagens"
      - "📊 Estado novo: Y mensagens"
      - "📤 Enviando via WebRTC..."
      - "✅ Enviado via WebRTC"
      - "💾 Persistindo no banco..."
      - "✅ Persistido com sucesso"

📍 PASSO 3: [WebRTCContext.send] - Envia via RTCDataChannel
   └─ Arquivo: src/contexts/WebRTCContext.tsx
   └─ Log: "PASSO 3: [WebRTCContext.send] Enviando via WebRTC"
   └─ O quê: Envia dados pelo WebRTC (se channel estiver aberto)
   └─ Resultado: RTCDataChannel.send(JSON.stringify(data))

⚠️  PASSO INTERMEDIÁRIO: Backend processa e faz broadcast
   └─ O servidor recebe a mensagem
   └─ Salva no banco de dados
   └─ Publica evento WebSocket para ambos os clientes (ALUNO e PROFESSOR)


┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLUXO DE RECEBIMENTO (ALUNO)                          │
└─────────────────────────────────────────────────────────────────────────────┘

📍 PASSO 4: [StudentWorkspacePage.handleMessage] - Recebe WebSocket
   └─ Arquivo: src/pages/workspace/StudentWorkspacePage.tsx
   └─ Listener: wsRef.current.addEventListener("message", handleMessage)
   └─ Log: "PASSO 4: [StudentWorkspacePage.handleMessage] Mensagem WebSocket recebida"
   └─ O quê:
      1. Recebe evento WebSocket
      2. Faz parse JSON
      3. Valida se type === "chat"
      4. Chama addIncomingRef.current?.(data)
   └─ Sub-passos:
      - "Raw data: ..."
      - "✅ Parse OK"
      - "Type: chat"
      - "💬 É mensagem de chat!"
      - "Autor: {name} ({id})"
      - "addIncomingRef.current: ✅"
      - "✅ Chamando addIncomingMessage()"

📍 PASSO 5: [useChatMessages.addIncomingMessage] - Processa mensagem recebida
   └─ Arquivo: src/hooks/useChatMessages.ts
   └─ Log: "PASSO 5: [useChatMessages.addIncomingMessage] Recebendo mensagem"
   └─ O quê:
      1. Valida se activityId corresponde à atividade atual
      2. Cria objeto ChatMessage com isOwn: false (não é dele)
      3. Evita duplicatas (check por ID)
      4. Adiciona ao estado → UI renderiza na "bolha do outro"
   └─ Sub-passos:
      - "ID: ..."
      - "Conteúdo: '...'"
      - "Autor: {name} ({id})"
      - "Atividade: {id}"
      - "Atividade atual (ref): {id}"
      - "✅ Atividade corresponde!"
      - "📌 isOwn: false"
      - "📊 Estado anterior: X mensagens"
      - "📊 Estado novo: Y mensagens"
      - "✅ Mensagem adicionada"


┌─────────────────────────────────────────────────────────────────────────────┐
│                    SIMILAR PARA PROFESSOR (ProfessorWorkspacePage)          │
└─────────────────────────────────────────────────────────────────────────────┘

Os mesmos PASSOS 1-5 são aplicáveis, apenas substituindo:
- StudentWorkspacePage → ProfessorWorkspacePage
- Mas a lógica é idêntica!

```

---

## 🎨 Como Ler os Logs no Console

### Exemplo de Fluxo Completo no Console:

```
🌉 [ChatBridge] Montando com activityId: activity-123
   Usuário: João Silva (user-456)
   WebRTC send disponível: ✅
   Hook useChatMessages instanciado
   📤 Expondo sendMessage via ref
   📥 Expondo addIncomingMessage via ref
🌉 [ChatBridge] Setup completo

📍 PASSO 0: [useChatMessages] Carregando histórico
   Atividade: activity-123
   Usuário: user-456
   ✅ Histórico carregado: 2 mensagens
      1. João Silva: "Olá, como vai?"
      2. Maria Santos: "Tudo bem, e você?"
📍 PASSO 0: Carregamento concluído

[... Usuário digita mensagem e clica enviar ...]

📤 [WorkspaceChat.handleSend] Enviando: "Ótimo! Como está indo?"
📍 [WorkspaceChat.handleSend] Atividade: Atividade 1

📍 PASSO 1.5: [StudentWorkspacePage.handleSendMessage] Intermediário
   Conteúdo: "Ótimo! Como está indo?"
   sendMessageRef.current: ✅

📍 PASSO 2: [useChatMessages.sendMessage] Enviando mensagem
   ID: 550e8400-e29b-41d4-a716-446655440000
   Conteúdo: "Ótimo! Como está indo?"
   Atividade: activity-123
   Usuário: João Silva (user-456)
   ✅ Mensagem otimista criada: 550e8400-e29b-41d4-a716-446655440000
   📊 Estado anterior: 2 mensagens
   📊 Estado novo: 3 mensagens
   📤 Enviando via WebRTC...
   ✅ Enviado via WebRTC

📍 PASSO 3: [WebRTCContext.send] Enviando via WebRTC
   RTCDataChannel state: open
   Data: {"type":"chat","id":"550e...","authorId":"user-456"...
   ✅ RTCDataChannel aberto, enviando...
   ✅ Enviado com sucesso

💾 Persistindo no banco...
✅ Persistido com sucesso

📍 PASSO 2: [useChatMessages.sendMessage] Concluído

[... No lado do professor, WebSocket dispara ...]

📍 PASSO 4: [ProfessorWorkspacePage.handleMessage] Mensagem WebSocket recebida
   Raw data: {"type":"chat","id":"550e8400-e29b-41d4-a716-446655440000"...
   ✅ Parse OK
   Type: chat
   💬 É mensagem de chat!
   Autor: João Silva (user-456)
   addIncomingRef.current: ✅
   ✅ Chamando addIncomingMessage()

📍 PASSO 5: [useChatMessages.addIncomingMessage] Recebendo mensagem
   ID: 550e8400-e29b-41d4-a716-446655440000
   Conteúdo: "Ótimo! Como está indo?"
   Autor: João Silva (user-456)
   Atividade: activity-123
   Atividade atual (ref): activity-123
   ✅ Atividade corresponde!
   📌 isOwn: false
   📊 Estado anterior: 1 mensagens (professor tinha só histórico)
   📊 Estado novo: 2 mensagens
   ✅ Mensagem adicionada

📍 PASSO 4: Concluído
```

---

## 🚨 Sinais de Alerta nos Logs

### ❌ Problemas que podem aparecer:

```
❌ [WorkspaceChat] Tentativa de enviar mensagem vazia
   → Usuário tentou enviar sem texto

❌ [useChatMessages.sendMessage] Validação falhou
   → activityId é nulo ou conteúdo está vazio

⚠️  RTCDataChannel não está aberto (state: connecting)
   → WebRTC ainda não conectou

❌ [StudentWorkspacePage] wsRef.current é null
   → WebSocket não está conectado

❌ addIncomingRef.current é null! Mensagem será ignorada.
   → ChatBridge ainda não foi montado ou foi desmontado

🚫 Atividade não corresponde! Ignorando mensagem.
   → Mensagem é de atividade diferente (usuário mudou de atividade)

🚫 Mensagem duplicada! ID já existe no histórico.
   → Mesma mensagem chegou 2x (via WebRTC e WebSocket)

ℹ️  Type não é 'chat': notification
   → Mensagem WebSocket não é de chat
```

---

## 📋 Checklist para Debugar

### Quando ALUNO envia e PROFESSOR não recebe:

```
[ ] 1. Procure por "PASSO 1:" no console (envio iniciado?)
[ ] 2. Procure por "PASSO 2:" no console (useChatMessages.sendMessage chamado?)
[ ] 3. Procure por "PASSO 3:" no console (WebRTC send chamado?)
[ ] 4. Procure por "💾 Persistindo no banco..." (API chamada?)
[ ] 5. Procure por "PASSO 4:" no console do PROFESSOR (WebSocket recebeu?)
[ ] 6. Se PASSO 4 aparecer, procure por "❌ addIncomingRef.current é null"
[ ] 7. Se PASSO 5 não aparecer, procure por "🚫 Atividade não corresponde"
```

### Quando PROFESSOR envia e ALUNO não recebe:

```
[ ] 1. Procure por "PASSO 1:" no console do PROFESSOR
[ ] 2. Procure por "PASSO 2:" no console do PROFESSOR
[ ] 3. Procure por "PASSO 4:" no console do ALUNO
[ ] 4. Se PASSO 4 não aparecer, WebSocket não está recebendo
[ ] 5. Se PASSO 5 não aparecer, mas PASSO 4 aparece:
       - Procure por "❌ addIncomingRef.current é null"
       - Procure por "🚫 Atividade não corresponde"
```

---

## 🎯 Resumo Visual

```
ENVIO                              PROFESSOR
┌──────────────────┐               ┌──────────────────┐
│  ALUNO           │  ────────→    │                  │
│  PASSO 1-5       │  (WebRTC)     │  Recebe em 1-3s  │
│  Mensagem sai ✅ │               │                  │
└──────────────────┘               └──────────────────┘
                                            ↓
                                    PASSO 4: WebSocket
                                    PASSO 5: Processa
                                            ↓
                                   Renderiza ✅
```


