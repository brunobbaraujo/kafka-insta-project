import { jest } from '@jest/globals';
import { mockQuery, mockKafkaProducer, mockWithTransaction } from '../setup.js';

// Import Post model
const Post = (await import('../../src/models/Post.js')).default;

// Import controller after mocking dependencies
const postController = (await import('../../src/controllers/postController.js')).default;

describe('PostController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const postData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption',
        media_file_id: '550e8400-e29b-41d4-a716-446655440001'
      };
      
      const savedPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...postData,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      req.body = postData;
      mockQuery.mockResolvedValueOnce({ rows: [savedPost] });

      await postController.createPost(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.arrayContaining([
          expect.any(String), // id
          postData.user_id,
          postData.caption,
          postData.media_file_id,
          0, // likes_count
          0, // comments_count
          expect.any(Date), // created_at
          expect.any(Date)  // updated_at
        ])
      );
      expect(mockKafkaProducer.publishPostCreated).toHaveBeenCalledWith(savedPost);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: savedPost
      });
    });

    it('should handle database error', async () => {
      req.body = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption'
      };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await postController.createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('getPost', () => {
    it('should get a post successfully', async () => {
      const post = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption',
        likes_count: 5,
        comments_count: 2
      };

      req.params.postId = post.id;
      mockQuery.mockResolvedValueOnce({ rows: [post] });

      await postController.getPost(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM posts WHERE id = $1',
        [post.id]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Post)
      });
    });

    it('should return 404 when post not found', async () => {
      req.params.postId = '123e4567-e89b-12d3-a456-426614174000';
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await postController.getPost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found'
      });
    });

    it('should handle database error', async () => {
      req.params.postId = '123e4567-e89b-12d3-a456-426614174000';
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await postController.getPost(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('getPosts', () => {
    it('should get posts with default pagination', async () => {
      const posts = [
        { id: '1', caption: 'Post 1' },
        { id: '2', caption: 'Post 2' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: posts });

      await postController.getPosts(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM posts'),
        [20, 0] // default limit and offset
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: {
          limit: 20,
          offset: 0,
          count: 2
        }
      });
    });

    it('should get posts with custom pagination', async () => {
      req.query = { limit: '10', offset: '5' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await postController.getPosts(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM posts'),
        [10, 5]
      );
    });
  });

  describe('getUserPosts', () => {
    it('should get user posts successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const posts = [{ id: '1', user_id: userId, caption: 'User post' }];

      req.params.userId = userId;
      mockQuery.mockResolvedValueOnce({ rows: posts });

      await postController.getUserPosts(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [userId, 20, 0]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: {
          limit: 20,
          offset: 0,
          count: 1
        }
      });
    });
  });

  describe('updatePost', () => {
    it('should update post successfully', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = { caption: 'Updated caption' };
      const existingPost = { id: postId, caption: 'Old caption' };
      const updatedPost = { ...existingPost, ...updates };

      req.params.postId = postId;
      req.body = updates;
      
      mockQuery
        .mockResolvedValueOnce({ rows: [existingPost] }) // findById
        .mockResolvedValueOnce({ rows: [updatedPost] }); // update

      await postController.updatePost(req, res);

      expect(mockKafkaProducer.publishPostUpdated).toHaveBeenCalledWith(
        expect.any(Post)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Post)
      });
    });

    it('should return 404 when post not found for update', async () => {
      req.params.postId = '123e4567-e89b-12d3-a456-426614174000';
      req.body = { caption: 'New caption' };
      
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await postController.updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found'
      });
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const post = { id: postId, caption: 'Post to delete' };

      req.params.postId = postId;
      
      mockQuery
        .mockResolvedValueOnce({ rows: [post] }) // findById
        .mockResolvedValueOnce({ rows: [] }); // delete

      await postController.deletePost(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM posts WHERE id = $1',
        [postId]
      );
      expect(mockKafkaProducer.publishPostDeleted).toHaveBeenCalledWith(
        expect.any(Post)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Post deleted successfully'
      });
    });

    it('should return 404 when post not found for deletion', async () => {
      req.params.postId = '123e4567-e89b-12d3-a456-426614174000';
      
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await postController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found'
      });
    });
  });

  describe('likePost', () => {
    it('should like post successfully', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updatedPost = { id: postId, likes_count: 6 };

      req.params.postId = postId;
      req.body = { user_id: userId };
      
      // Mock transaction behavior
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // Check existing like - none found
            .mockResolvedValueOnce({ rows: [{ id: 'like-id' }] }) // Insert like
            .mockResolvedValueOnce({ rows: [updatedPost] }) // Update post likes_count
        };
        return await callback(mockClient);
      });

      await postController.likePost(req, res);

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockKafkaProducer.publishPostLiked).toHaveBeenCalledWith(
        expect.any(Post),
        userId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Post),
        message: 'Post liked successfully'
      });
    });

    it('should return 400 when user already liked the post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      req.params.postId = postId;
      req.body = { user_id: userId };
      
      // Mock transaction that throws error when like already exists
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'existing-like' }] }) // Existing like found
        };
        return await callback(mockClient);
      });

      await postController.likePost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User has already liked this post'
      });
    });

    it('should return 404 when post not found for like', async () => {
      req.params.postId = '123e4567-e89b-12d3-a456-426614174000';
      req.body = { user_id: '550e8400-e29b-41d4-a716-446655440000' };
      
      // Mock transaction behavior where post is not found
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // Check existing like - none found
            .mockResolvedValueOnce({ rows: [{ id: 'like-id' }] }) // Insert like
            .mockResolvedValueOnce({ rows: [] }) // Update post - no post found
        };
        return await callback(mockClient);
      });

      await postController.likePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found'
      });
    });
  });

  describe('unlikePost', () => {
    it('should unlike post successfully', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updatedPost = { id: postId, likes_count: 4 };

      req.params.postId = postId;
      req.body = { user_id: userId };
      
      // Mock transaction behavior
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'existing-like' }] }) // Existing like found
            .mockResolvedValueOnce({ rows: [{ id: 'existing-like' }] }) // Delete like
            .mockResolvedValueOnce({ rows: [updatedPost] }) // Update post likes_count
        };
        return await callback(mockClient);
      });

      await postController.unlikePost(req, res);

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockKafkaProducer.publishPostUnliked).toHaveBeenCalledWith(
        expect.any(Post),
        userId
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Post),
        message: 'Post unliked successfully'
      });
    });

    it('should return 400 when user has not liked the post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      req.params.postId = postId;
      req.body = { user_id: userId };
      
      // Mock transaction that throws error when no like found
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // No existing like found
        };
        return await callback(mockClient);
      });

      await postController.unlikePost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User has not liked this post'
      });
    });
  });
});