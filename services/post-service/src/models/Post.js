import { query as _query } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class Post {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.user_id = data.user_id;
    this.caption = data.caption || "";
    this.media_file_id = data.media_file_id || null;
    this.likes_count = data.likes_count || 0;
    this.comments_count = data.comments_count || 0;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        caption TEXT,
        media_file_id UUID,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    `;

    await _query(query);
  }

  async save() {
    const query = `
      INSERT INTO posts (id, user_id, caption, media_file_id, likes_count, comments_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      this.id,
      this.user_id,
      this.caption,
      this.media_file_id,
      this.likes_count,
      this.comments_count,
      this.created_at,
      this.updated_at,
    ];

    const result = await _query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = "SELECT * FROM posts WHERE id = $1";
    const result = await _query(query, [id]);
    return result.rows[0] ? new Post(result.rows[0]) : null;
  }

  static async findByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM posts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await _query(query, [userId, limit, offset]);
    return result.rows.map((row) => new Post(row));
  }

  static async findAll(limit = 20, offset = 0) {
    const query = `
      SELECT * FROM posts
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await _query(query, [limit, offset]);
    return result.rows.map((row) => new Post(row));
  }

  async update(updates) {
    const fields = Object.keys(updates)
      .filter((key) => key !== "id" && key !== "created_at")
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ");

    if (!fields) return this;

    const values = [
      this.id,
      ...Object.values(updates).filter(
        (_, index) =>
          Object.keys(updates)[index] !== "id" &&
          Object.keys(updates)[index] !== "created_at",
      ),
    ];

    updates.updated_at = new Date();

    const query = `
      UPDATE posts
      SET ${fields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await _query(query, values);
    return new Post(result.rows[0]);
  }

  async delete() {
    const query = "DELETE FROM posts WHERE id = $1";
    await _query(query, [this.id]);
  }

  static async incrementLikes(postId) {
    const query = `
      UPDATE posts
      SET likes_count = likes_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await _query(query, [postId]);
    return result.rows[0] ? new Post(result.rows[0]) : null;
  }

  static async decrementLikes(postId) {
    const query = `
      UPDATE posts
      SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await _query(query, [postId]);
    return result.rows[0] ? new Post(result.rows[0]) : null;
  }
}

export const createTable = Post.createTable;
export default Post;
