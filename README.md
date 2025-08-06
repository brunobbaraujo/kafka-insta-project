# Kafka Instagram-like Project

Um projeto de feed social similar ao Instagram construído com **Apache Kafka** para processamento de eventos em tempo real, **React** no frontend e arquitetura de **microserviços**.

## 🎯 Objetivo

Aprender e implementar conceitos de **Event Streaming** com Kafka em um contexto prático, construindo uma aplicação social moderna com atualizações em tempo real.

## 🏗️ Arquitetura

```
React App ←→ API Gateway ←→ Microserviços
                ↓              ↓
        Kafka Event Bus ←→ Redis Cache
                ↓
           PostgreSQL
```

### Microserviços Planejados
- **User Service** - Gestão de usuários e relacionamentos
- **Post Service** - CRUD de posts e upload de imagens  
- **Timeline Service** - Feeds personalizados com cache Redis
- **Notification Service** - Notificações em tempo real

### Eventos Kafka
- `user-events` - Registro, follow/unfollow
- `post-events` - Criação, edição, exclusão de posts
- `interaction-events` - Likes, comentários
- `timeline-events` - Atualizações de feed
- `notification-events` - Sistema de notificações

## 🚀 Quick Start

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+

### Executar Kafka
```bash
# Iniciar cluster Kafka (KRaft mode)
docker compose up -d

# Verificar status
docker compose ps

# Acessar Kafka UI
open http://localhost:8080
```

### Desenvolvimento
```bash
# Parar cluster
docker compose down

# Ver logs
docker compose logs kafka
```

## 📋 Roadmap

### ✅ Fase 1: Setup Kafka
- [x] Docker Compose com Kafka KRaft
- [x] Kafka UI para monitoramento

### 🔄 Fase 2: Microserviços Core
- [ ] Post Service básico
- [ ] Producers/Consumers Kafka
- [ ] API Gateway com autenticação
- [ ] Frontend React básico

### 📈 Fase 3: Funcionalidades Avançadas
- [ ] Sistema de likes em tempo real
- [ ] Timeline com cache Redis
- [ ] Upload de imagens
- [ ] WebSocket para atualizações live

### 🔧 Fase 4: Otimizações
- [ ] Particionamento otimizado
- [ ] Consumer groups
- [ ] Dead letter queues
- [ ] Monitoring e observabilidade

## 🛠️ Stack Tecnológico

**Backend:**
- Apache Kafka (Event Streaming)
- Node.js + Express (API Gateway)
- PostgreSQL (Dados persistentes)
- Redis (Cache de timeline)
- Docker + Docker Compose

**Frontend:**
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Socket.IO (Real-time)
- Zustand (Estado global)

## 📚 Aprendizados

Este projeto explora:
- **Event-Driven Architecture** com Kafka
- **Microserviços** desacoplados via eventos
- **CQRS** para separar leitura/escrita
- **Real-time updates** via WebSocket
- **Cache strategies** com Redis
- **Horizontal scaling** com Kafka partitions

## 📖 Documentação

Veja `plan.md` para detalhes completos da arquitetura e casos de uso.