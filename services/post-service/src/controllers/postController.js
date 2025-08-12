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

      const updatedPost = await Post.addLike(postId, user_id);
      if (!updatedPost) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Publish event to Kafka
      await kafkaProducer.publishPostLiked(updatedPost, user_id);

      res.json({
        success: true,
        data: updatedPost,
        message: "Post liked successfully",
      });
    } catch (error) {
      console.error("Error liking post:", error);
      
      if (error.message === "User has already liked this post") {
        return res.status(400).json({
          success: false,
          error: "User has already liked this post",
        });
      }
      
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

      const updatedPost = await Post.removeLike(postId, user_id);
      if (!updatedPost) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Publish event to Kafka
      await kafkaProducer.publishPostUnliked(updatedPost, user_id);

      res.json({
        success: true,
        data: updatedPost,
        message: "Post unliked successfully",
      });
    } catch (error) {
      console.error("Error unliking post:", error);
      
      if (error.message === "User has not liked this post") {
        return res.status(400).json({
          success: false,
          error: "User has not liked this post",
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

export default new PostController();
