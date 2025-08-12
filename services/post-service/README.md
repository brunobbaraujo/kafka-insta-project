# Post Service

Microserviço responsável pelo gerenciamento de posts no projeto Instagram-like com **arquitetura event-driven**.

## Funcionalidades

- ✅ CRUD completo de posts
- ✅ Sistema de likes/unlikes **assíncrono** com Kafka
- ✅ **Event-driven architecture** para alta performance
- ✅ **Idempotência** e proteção contra duplicação
- ✅ Paginação de posts
- ✅ Filtro por usuário
- ✅ Eventos Kafka para notificações
- ✅ **Transações atômicas** para consistência
- ✅ Validação de dados com Joi
- ✅ Modelo de dados PostgreSQL

## API Endpoints

### Posts
- `POST /api/posts` - Criar novo post
- `GET /api/posts` - Listar todos os posts (paginado)
- `GET /api/posts/:postId` - Obter post específico
- `GET /api/posts/user/:userId` - Obter posts de um usuário
- `PUT /api/posts/:postId` - Atualizar post
- `DELETE /api/posts/:postId` - Deletar post

### Interações (Event-Driven)
- `POST /api/posts/:postId/like` - Curtir post (retorna `202 Accepted`)
- `POST /api/posts/:postId/unlike` - Descurtir post (retorna `202 Accepted`)

> **Nota**: As operações de like/unlike são processadas **assincronamente** via Kafka para máxima performance. A API retorna imediatamente com status `202 Accepted` e o processamento acontece em background.

### Health Check
- `GET /health` - Verificar status do serviço

## Arquitetura Event-Driven

### Kafka Topics

#### `post-events` (Geral)
- `POST_CREATED` - Post criado
- `POST_UPDATED` - Post atualizado  
- `POST_DELETED` - Post deletado

#### `post.liked` / `post.unliked` (Dedicados)
Eventos processados assincronamente com `event_id`, `post`, `user_id` e `timestamp`.

### Consumer Groups
- `post-service-likes` - Processa eventos de like/unlike com idempotência

## Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure as variáveis de ambiente no arquivo `.env`

3. Instale as dependências:
```bash
npm install
```

4. Execute em modo de desenvolvimento:
```bash
npm run dev
```

## Banco de Dados

### Tabela `posts`
- `id` (UUID) - Chave primária
- `user_id` (UUID) - ID do usuário (NOT NULL)
- `caption` (TEXT) - Legenda do post
- `media_file_id` (UUID) - Referência para Media Service
- `likes_count` (INTEGER) - Contador de likes (atualizado via events)
- `comments_count` (INTEGER) - Contador de comentários
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização

### Tabela `post_likes` (Event-Driven)
- `id` (UUID) - Chave primária
- `post_id` (UUID) - Referência para post (FK + CASCADE)
- `user_id` (UUID) - ID do usuário que curtiu
- `created_at` (TIMESTAMP) - Data do like
- **UNIQUE(post_id, user_id)** - Evita likes duplicados

### Tabela `processed_events` (Idempotência)
- `event_id` (VARCHAR UNIQUE) - ID único do evento
- `event_type`, `post_id`, `user_id`, `status`, `processed_at`

### Índices
- `idx_posts_user_id` - Para queries por usuário
- `idx_posts_created_at` - Para ordenação por data
- `idx_post_likes_post_id` - Para contagem de likes por post
- `idx_post_likes_user_id` - Para likes por usuário
- `idx_processed_events_event_id` - Para verificação de idempotência

## Tecnologias

- **Express** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **KafkaJS** - Cliente Kafka para eventos
- **Joi** - Validação de dados de entrada
- **UUID** - Geração de IDs únicos
- **Jest** - Framework de testes

## Monitoramento

- Health checks via `/health` endpoint
- Event tracking na tabela `processed_events`