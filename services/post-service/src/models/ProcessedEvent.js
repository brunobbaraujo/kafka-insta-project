import { query as _query } from "../config/database.js";

class ProcessedEvent {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS processed_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        post_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status VARCHAR(50) NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON processed_events(event_id);
      CREATE INDEX IF NOT EXISTS idx_processed_events_post_user ON processed_events(post_id, user_id);
    `;

    await _query(query);
  }
}

export const createTable = ProcessedEvent.createTable;
export default ProcessedEvent;