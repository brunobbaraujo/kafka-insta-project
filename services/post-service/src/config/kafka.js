import { Kafka } from "kafkajs";
import { v4 as uuidv4 } from "uuid";

const kafka = new Kafka({
  clientId: "post-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
});

const admin = kafka.admin();

class KafkaProducer {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      await producer.connect();
      this.isConnected = true;
      console.log("Kafka producer connected");
    } catch (error) {
      console.error("Error connecting to Kafka:", error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) return;

    try {
      await producer.disconnect();
      this.isConnected = false;
      console.log("Kafka producer disconnected");
    } catch (error) {
      console.error("Error disconnecting from Kafka:", error);
    }
  }

  async createTopics() {
    try {
      await admin.connect();

      const topics = [
        {
          topic: "post-events",
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: "cleanup.policy", value: "delete" },
            { name: "retention.ms", value: "604800000" }, // 7 days
          ],
        },
        {
          topic: "post.liked",
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: "cleanup.policy", value: "delete" },
            { name: "retention.ms", value: "259200000" }, // 3 days
          ],
        },
        {
          topic: "post.unliked",
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: "cleanup.policy", value: "delete" },
            { name: "retention.ms", value: "259200000" }, // 3 days
          ],
        },
      ];

      const existingTopics = await admin.listTopics();
      const topicsToCreate = topics.filter(
        (topic) => !existingTopics.includes(topic.topic),
      );

      if (topicsToCreate.length > 0) {
        await admin.createTopics({ topics: topicsToCreate });
        console.log(
          "Created Kafka topics:",
          topicsToCreate.map((t) => t.topic),
        );
      }

      await admin.disconnect();
    } catch (error) {
      console.error("Error creating Kafka topics:", error);
      await admin.disconnect();
    }
  }

  async publishPostEvent(eventType, postData, userId) {
    if (!this.isConnected) {
      await this.connect();
    }

    const message = {
      topic: "post-events",
      messages: [
        {
          key: postData.id,
          value: JSON.stringify({
            eventType,
            postId: postData.id,
            userId: userId || postData.user_id,
            data: postData,
            timestamp: new Date().toISOString(),
            version: "1.0",
          }),
          timestamp: Date.now().toString(),
        },
      ],
    };

    try {
      const result = await producer.send(message);
      console.log(
        `Published ${eventType} event for post ${postData.id}:`,
        result,
      );
      return result;
    } catch (error) {
      console.error(`Error publishing ${eventType} event:`, error);
      throw error;
    }
  }

  // Specific event methods
  async publishPostCreated(postData) {
    return this.publishPostEvent("POST_CREATED", postData);
  }

  async publishPostUpdated(postData) {
    return this.publishPostEvent("POST_UPDATED", postData);
  }

  async publishPostDeleted(postData) {
    return this.publishPostEvent("POST_DELETED", postData);
  }

  async publishPostLiked(postData, userId) {
    if (!this.isConnected) {
      await this.connect();
    }

    const eventId = uuidv4();
    const message = {
      topic: "post.liked",
      messages: [
        {
          key: `${postData.id}-${userId}`,
          value: JSON.stringify({
            event_id: eventId,
            post: postData,
            user_id: userId,
            timestamp: new Date().toISOString(),
            version: "1.0",
          }),
          timestamp: Date.now().toString(),
        },
      ],
    };

    try {
      const result = await producer.send(message);
      console.log(`Published post.liked event ${eventId} for post ${postData.id}:`, result);
      return result;
    } catch (error) {
      console.error("Error publishing post.liked event:", error);
      throw error;
    }
  }

  async publishPostUnliked(postData, userId) {
    if (!this.isConnected) {
      await this.connect();
    }

    const eventId = uuidv4();
    const message = {
      topic: "post.unliked",
      messages: [
        {
          key: `${postData.id}-${userId}`,
          value: JSON.stringify({
            event_id: eventId,
            post: postData,
            user_id: userId,
            timestamp: new Date().toISOString(),
            version: "1.0",
          }),
          timestamp: Date.now().toString(),
        },
      ],
    };

    try {
      const result = await producer.send(message);
      console.log(`Published post.unliked event ${eventId} for post ${postData.id}:`, result);
      return result;
    } catch (error) {
      console.error("Error publishing post.unliked event:", error);
      throw error;
    }
  }
}

export default new KafkaProducer();
