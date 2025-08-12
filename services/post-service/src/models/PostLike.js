import { query as _query } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class PostLike {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.post_id = data.post_id;
    this.user_id = data.user_id;
    this.created_at = data.created_at || new Date();
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS post_likes (
        id UUID PRIMARY KEY,
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
    `;

    await _query(query);
  }

  async save() {
    const query = `
      INSERT INTO post_likes (id, post_id, user_id, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [this.id, this.post_id, this.user_id, this.created_at];

    const result = await _query(query, values);
    return result.rows[0];
  }

  static async findByPostAndUser(postId, userId) {
    const query = "SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2";
    const result = await _query(query, [postId, userId]);
    return result.rows[0] ? new PostLike(result.rows[0]) : null;
  }

  static async deleteByPostAndUser(postId, userId) {
    const query = "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING *";
    const result = await _query(query, [postId, userId]);
    return result.rows[0] ? new PostLike(result.rows[0]) : null;
  }

  static async countByPost(postId) {
    const query = "SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1";
    const result = await _query(query, [postId]);
    return parseInt(result.rows[0].count);
  }
}

export const createTable = PostLike.createTable;
export default PostLike;