# Post Service

Microserviço responsável pelo gerenciamento de posts no projeto Instagram-like.

## Funcionalidades

- ✅ CRUD completo de posts
- ✅ Sistema de likes/unlikes
- ✅ Paginação de posts
- ✅ Filtro por usuário
- ✅ Eventos Kafka para notificações
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

### Interações
- `POST /api/posts/:postId/like` - Curtir post
- `POST /api/posts/:postId/unlike` - Descurtir post

### Health Check
- `GET /health` - Verificar status do serviço

## Eventos Kafka

O serviço publica os seguintes eventos no tópico `post-events`:

- `POST_CREATED` - Post criado
- `POST_UPDATED` - Post atualizado
- `POST_DELETED` - Post deletado
- `POST_LIKED` - Post curtido
- `POST_UNLIKED` - Post descurtido

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
- `likes_count` (INTEGER) - Contador de likes
- `comments_count` (INTEGER) - Contador de comentários
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização

### Índices
- `idx_posts_user_id` - Para queries por usuário
- `idx_posts_created_at` - Para ordenação por data

## Dependências

- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **KafkaJS** - Cliente Kafka
- **Joi** - Validação de dados
- **UUID** - Geração de IDs únicos