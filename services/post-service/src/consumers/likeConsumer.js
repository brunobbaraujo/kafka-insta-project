import { Kafka } from "kafkajs";
import { withTransaction } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class LikeConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: "post-service-like-consumer",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: "post-service-likes",
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async connect() {
    await this.consumer.connect();
    console.log("Like consumer connected to Kafka");
  }

  async disconnect() {
    await this.consumer.disconnect();
    console.log("Like consumer disconnected from Kafka");
  }

  async subscribe() {
    await this.consumer.subscribe({
      topics: ["post.liked", "post.unliked"],
      fromBeginning: false,
    });
  }

  async run() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          
          console.log(`Processing ${topic} event:`, {
            partition,
            offset: message.offset,
            event: event,
          });

          switch (topic) {
            case "post.liked":
              await this.handleLikeEvent(event);
              break;
            case "post.unliked":
              await this.handleUnlikeEvent(event);
              break;
            default:
              console.warn(`Unknown topic: ${topic}`);
          }
        } catch (error) {
          console.error(`Error processing message from topic ${topic}:`, error);
          // In production, you might want to send to a dead letter queue
        }
      },
    });
  }

  async handleLikeEvent(event) {
    const { post, user_id, event_id, timestamp } = event;
    
    await withTransaction(async (client) => {
      // Check for idempotency - has this event been processed already?
      const existingEventQuery = "SELECT * FROM processed_events WHERE event_id = $1";
      const existingEventResult = await client.query(existingEventQuery, [event_id]);
      
      if (existingEventResult.rows.length > 0) {
        console.log(`Event ${event_id} already processed, skipping...`);
        return;
      }

      // Check if like already exists (duplicate protection)
      const existingLikeQuery = "SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2";
      const existingLikeResult = await client.query(existingLikeQuery, [post.id, user_id]);
      
      if (existingLikeResult.rows.length > 0) {
        console.log(`Like already exists for post ${post.id} by user ${user_id}, skipping...`);
        // Still mark event as processed to avoid reprocessing
        await this.markEventAsProcessed(client, event_id, 'like', post.id, user_id, 'duplicate');
        return;
      }

      // Create the like
      const likeId = uuidv4();
      const insertLikeQuery = `
        INSERT INTO post_likes (id, post_id, user_id, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(insertLikeQuery, [likeId, post.id, user_id, new Date(timestamp)]);

      // Update post likes count
      const updatePostQuery = `
        UPDATE posts
        SET likes_count = likes_count + 1, updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(updatePostQuery, [post.id]);

      // Mark event as processed
      await this.markEventAsProcessed(client, event_id, 'like', post.id, user_id, 'processed');
      
      console.log(`Successfully processed like event ${event_id} for post ${post.id}`);
    });
  }

  async handleUnlikeEvent(event) {
    const { post, user_id, event_id, timestamp } = event;
    
    await withTransaction(async (client) => {
      // Check for idempotency - has this event been processed already?
      const existingEventQuery = "SELECT * FROM processed_events WHERE event_id = $1";
      const existingEventResult = await client.query(existingEventQuery, [event_id]);
      
      if (existingEventResult.rows.length > 0) {
        console.log(`Event ${event_id} already processed, skipping...`);
        return;
      }

      // Check if like exists to remove
      const existingLikeQuery = "SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2";
      const existingLikeResult = await client.query(existingLikeQuery, [post.id, user_id]);
      
      if (existingLikeResult.rows.length === 0) {
        console.log(`No like found for post ${post.id} by user ${user_id}, skipping...`);
        // Still mark event as processed to avoid reprocessing
        await this.markEventAsProcessed(client, event_id, 'unlike', post.id, user_id, 'not_found');
        return;
      }

      // Remove the like
      const deleteLikeQuery = "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2";
      await client.query(deleteLikeQuery, [post.id, user_id]);

      // Update post likes count
      const updatePostQuery = `
        UPDATE posts
        SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(updatePostQuery, [post.id]);

      // Mark event as processed
      await this.markEventAsProcessed(client, event_id, 'unlike', post.id, user_id, 'processed');
      
      console.log(`Successfully processed unlike event ${event_id} for post ${post.id}`);
    });
  }

  async markEventAsProcessed(client, eventId, eventType, postId, userId, status) {
    const query = `
      INSERT INTO processed_events (event_id, event_type, post_id, user_id, status, processed_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    await client.query(query, [eventId, eventType, postId, userId, status]);
  }
}

export default new LikeConsumer();