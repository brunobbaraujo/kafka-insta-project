import { Router } from "express";
const router = Router();
import postController from "../controllers/postController.js";
import { validateRequest, createPostSchema, updatePostSchema, likePostSchema } from "../middleware/validation.js";

// Create a new post
router.post("/", validateRequest(createPostSchema), postController.createPost);

// Get all posts (with pagination)
router.get("/", postController.getPosts);

// Get a specific post
router.get("/:postId", postController.getPost);

// Get posts by user
router.get("/user/:userId", postController.getUserPosts);

// Update a post
router.put(
  "/:postId",
  validateRequest(updatePostSchema),
  postController.updatePost,
);

// Delete a post
router.delete("/:postId", postController.deletePost);

// Like a post
router.post(
  "/:postId/like",
  validateRequest(likePostSchema),
  postController.likePost,
);

// Unlike a post
router.post(
  "/:postId/unlike",
  validateRequest(likePostSchema),
  postController.unlikePost,
);

export default router;
