# Projeto Instagram-like com Kafka - Arquitetura Alto Nível

## Visão Geral
Este projeto implementa um feed social similar ao Instagram utilizando Kafka para processamento de eventos em tempo real, React no frontend e uma arquitetura baseada em microserviços.

## Arquitetura Geral

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   API Gateway   │    │   Kafka Cluster │
│   (Frontend)    │◄───┤   (Node.js)     │◄───┤   (Event Bus)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │  Microserviços  │    │   Redis Cache   │
│   (Dados User)  │    │                 │    │   (Timeline)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Componentes Principais

### 1. Frontend (React)
- **Tecnologias**: React, WebSocket/SSE, Axios
- **Funcionalidades**:
  - Feed de posts em tempo real
  - Upload de imagens
  - Likes e comentários
  - Perfil do usuário

### 2. API Gateway (Node.js/Express)
- **Responsabilidades**:
  - Autenticação e autorização
  - Rate limiting
  - Roteamento para microserviços
  - Validação básica de requests
  - WebSocket para atualizações em tempo real (consumindo eventos Kafka)

### 3. Microserviços

#### User Service
- **Banco**: PostgreSQL
- **Funcionalidades**:
  - Gerenciamento de usuários
  - Seguir/deixar de seguir
  - Perfis e configurações
  - Referências para avatares (media_file_id)

#### Post Service
- **Banco**: PostgreSQL
- **Funcionalidades**:
  - CRUD de posts
  - Metadados dos posts
  - Referências para imagens (media_file_id do Media Service)
- **Integração**: Comunica com Media Service via eventos Kafka para associar mídias aos posts

#### Timeline Service
- **Cache**: Redis
- **Funcionalidades**:
  - Geração de timeline personalizada
  - Cache de feeds por usuário
  - Paginação otimizada

#### Media Service
- **Storage**: S3/MinIO
- **Banco**: PostgreSQL (metadados)
- **Funcionalidades**:
  - Upload de imagens (avatares, posts)
  - Processamento de imagens (resize, compress)
  - CDN URLs e metadados
  - Controle de acesso
- **Integração**: Notifica Post/User Service via `media-events` quando upload é concluído

#### Notification Service
- **Funcionalidades**:
  - Notificações push
  - Email notifications
  - Histórico de notificações

### 4. Kafka - Event Streaming

#### Tópicos Principais:
```
user-events        # Eventos de usuário (registro, follow/unfollow)
post-events        # Eventos de posts (criação, edição, exclusão)
interaction-events # Eventos de interação (likes, comentários)
timeline-events    # Eventos para atualização de timeline
notification-events # Eventos para notificações
media-events       # Eventos de upload/processamento de imagens
```

#### Fluxo de Eventos:
1. **Post Criado**: Post Service → `post-events` → Timeline Service (atualiza feeds)
2. **Like Dado**: Post Service → `interaction-events` → Notification Service
3. **Novo Seguidor**: User Service → `user-events` → Timeline Service (reconstrói timeline)
4. **Upload Imagem**: Media Service → `media-events` → Post/User Service (atualiza referência)

## Casos de Uso com Kafka

### 1. Publicação de Post
```
1. Usuário posta foto
2. Post Service salva no DB e publica evento "post-created"
3. Timeline Service consome evento e atualiza feeds dos seguidores
4. Notification Service notifica seguidores sobre novo post
```

### 2. Upload de Imagem para Post
```
1. Usuário seleciona imagem no frontend
2. Frontend → Media Service (upload direto)
3. Media Service processa e armazena imagem
4. Media Service publica "media-uploaded" no Kafka com media_id
5. Post Service consome evento e associa media_id ao post
6. Post Service publica "post-created" para atualizar timelines
```

### 3. Sistema de Likes
```
1. Usuário curte post
2. API Gateway → Post Service (processa like)
3. Post Service atualiza contador de likes e publica "like-given" no Kafka
4. Notification Service consome evento e notifica dono do post
5. Timeline Service consome evento e pode reordenar feeds baseado em engajamento
```

### 4. Timeline em Tempo Real
```
1. Timeline Service mantém cache Redis com feeds pré-computados
2. Eventos do Kafka atualizam caches automaticamente
3. Timeline Service publica eventos de atualização
4. API Gateway consome eventos e faz WebSocket push para frontend
```

## Tecnologias

### Backend:
- **Kafka**: Apache Kafka (ou Confluent)
- **API**: Node.js + Express
- **Banco**: PostgreSQL
- **Cache**: Redis
- **Storage**: MinIO/S3 para imagens
- **Container**: Docker + Docker Compose

### Frontend:
- **Framework**: React + TypeScript
- **Estado**: Zustand ou Redux Toolkit
- **HTTP**: Axios
- **Real-time**: Socket.IO ou WebSocket nativo
- **UI**: Tailwind CSS + shadcn/ui

### DevOps:
- **Orquestração**: Docker Compose (desenvolvimento)
- **Monitoramento**: Kafka UI, Redis Insights
- **Logs**: Winston + ELK Stack (opcional)

## Fases de Desenvolvimento

### Fase 1: Básico (Aprender Kafka)
1. Setup Kafka local com Docker
2. Microserviço simples de posts
3. Producer/Consumer básicos
4. Frontend básico para visualizar

### Fase 2: Funcionalidades Core
1. Sistema completo de usuários
2. Timeline com cache Redis
3. Sistema de likes/comentários
4. Upload de imagens

### Fase 3: Otimizações
1. Particionamento otimizado do Kafka
2. Consumer groups para escalabilidade
3. Dead letter queues para tratamento de erros
4. Monitoring e observabilidade

## Benefícios do Kafka neste Projeto

1. **Desacoplamento**: Microserviços independentes
2. **Escalabilidade**: Processamento paralelo de eventos
3. **Resiliência**: Eventos persistidos, replay possível
4. **Tempo Real**: Atualizações instantâneas no feed
5. **Auditoria**: Log completo de todas as ações

## Próximos Passos

1. Configurar ambiente Kafka local
2. Implementar primeiro microserviço (Post Service)
3. Criar producers/consumers básicos
4. Desenvolver frontend React básico
5. Integrar WebSocket para tempo real