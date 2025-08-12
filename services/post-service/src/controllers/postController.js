import Post from "../models/Post.js";
import kafkaProducer from "../config/kafka.js";

class PostController {
  async createPost(req, res) {
    try {
      const { user_id, caption, media_file_id } = req.body;

      const post = new Post({
        user_id,
        caption,
        media_file_id,
      });

      const savedPost = await post.save();

      // Publish event to Kafka
      await kafkaProducer.publishPostCreated(savedPost);

      res.status(201).json({
        success: true,
        data: savedPost,
      });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getPost(req, res) {
    try {
      const { postId } = req.params;
      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getPosts(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const posts = await Post.findAll(parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        data: posts,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: posts.length,
        },
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getUserPosts(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const posts = await Post.findByUserId(
        userId,
        parseInt(limit),
        parseInt(offset),
      );

      res.json({
        success: true,
        data: posts,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: posts.length,
        },
      });
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const updates = req.body;

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      const updatedPost = await post.update(updates);

      // Publish event to Kafka
      await kafkaProducer.publishPostUpdated(updatedPost);

      res.json({
        success: true,
        data: updatedPost,
      });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async deletePost(req, res) {
    try {
      const { postId } = req.params;

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      await post.delete();

      // Publish event to Kafka
      await kafkaProducer.publishPostDeleted(post);

      res.json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async likePost(req, res) {
    try {
      const { postId } = req.params;
      const { user_id } = req.body;

      // Verify post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Publish like event to Kafka for async processing
      await kafkaProducer.publishPostLiked(post, user_id);

      // Return immediate response (202 Accepted for async processing)
      res.status(202).json({
        success: true,
        message: "Like request received and being processed",
        data: {
          post_id: postId,
          user_id: user_id,
        },
      });
    } catch (error) {
      console.error("Error processing like request:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async unlikePost(req, res) {
    try {
      const { postId } = req.params;
      const { user_id } = req.body;

      // Verify post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Publish unlike event to Kafka for async processing
      await kafkaProducer.publishPostUnliked(post, user_id);

      // Return immediate response (202 Accepted for async processing)
      res.status(202).json({
        success: true,
        message: "Unlike request received and being processed",
        data: {
          post_id: postId,
          user_id: user_id,
        },
      });
    } catch (error) {
      console.error("Error processing unlike request:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

export default new PostController();
