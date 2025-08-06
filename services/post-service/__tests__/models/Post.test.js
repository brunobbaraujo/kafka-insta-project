import { jest } from '@jest/globals';
import { mockQuery } from '../setup.js';

const Post = (await import('../../src/models/Post.js')).default;

describe('Post Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create post with provided data', () => {
      const postData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption',
        media_file_id: '550e8400-e29b-41d4-a716-446655440001',
        likes_count: 5,
        comments_count: 2
      };

      const post = new Post(postData);

      expect(post.id).toBe(postData.id);
      expect(post.user_id).toBe(postData.user_id);
      expect(post.caption).toBe(postData.caption);
      expect(post.media_file_id).toBe(postData.media_file_id);
      expect(post.likes_count).toBe(postData.likes_count);
      expect(post.comments_count).toBe(postData.comments_count);
    });

    it('should create post with default values', () => {
      const postData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const post = new Post(postData);

      expect(post.id).toBeDefined();
      expect(post.user_id).toBe(postData.user_id);
      expect(post.caption).toBe('');
      expect(post.media_file_id).toBeNull();
      expect(post.likes_count).toBe(0);
      expect(post.comments_count).toBe(0);
      expect(post.created_at).toBeInstanceOf(Date);
      expect(post.updated_at).toBeInstanceOf(Date);
    });

    it('should generate UUID if no id provided', () => {
      const post = new Post({ user_id: 'test-user' });
      
      expect(post.id).toBeDefined();
      expect(post.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('save', () => {
    it('should save post to database', async () => {
      const postData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption',
        media_file_id: '550e8400-e29b-41d4-a716-446655440001'
      };

      const savedPost = { id: '123', ...postData, likes_count: 0, comments_count: 0 };
      mockQuery.mockResolvedValueOnce({ rows: [savedPost] });

      const post = new Post(postData);
      const result = await post.save();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.arrayContaining([
          post.id,
          post.user_id,
          post.caption,
          post.media_file_id,
          post.likes_count,
          post.comments_count,
          post.created_at,
          post.updated_at
        ])
      );
      expect(result).toEqual(savedPost);
    });

    it('should handle database error on save', async () => {
      const post = new Post({ user_id: 'test-user' });
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(post.save()).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find post by id', async () => {
      const postData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Found post'
      };

      mockQuery.mockResolvedValueOnce({ rows: [postData] });

      const result = await Post.findById(postData.id);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM posts WHERE id = $1',
        [postData.id]
      );
      expect(result).toBeInstanceOf(Post);
      expect(result.id).toBe(postData.id);
      expect(result.caption).toBe(postData.caption);
    });

    it('should return null when post not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Post.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find posts by user id with default pagination', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const posts = [
        { id: '1', user_id: userId, caption: 'Post 1' },
        { id: '2', user_id: userId, caption: 'Post 2' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: posts });

      const result = await Post.findByUserId(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [userId, 20, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Post);
      expect(result[1]).toBeInstanceOf(Post);
    });

    it('should find posts by user id with custom pagination', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await Post.findByUserId(userId, 10, 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [userId, 10, 5]
      );
    });
  });

  describe('findAll', () => {
    it('should find all posts with default pagination', async () => {
      const posts = [
        { id: '1', caption: 'Post 1' },
        { id: '2', caption: 'Post 2' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: posts });

      const result = await Post.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM posts'),
        [20, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Post);
    });

    it('should find all posts with custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await Post.findAll(5, 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM posts'),
        [5, 10]
      );
    });
  });

  describe('update', () => {
    it('should update post successfully', async () => {
      const postData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Original caption'
      };

      const updates = { caption: 'Updated caption' };
      const updatedData = { ...postData, ...updates };

      mockQuery.mockResolvedValueOnce({ rows: [updatedData] });

      const post = new Post(postData);
      const result = await post.update(updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts'),
        expect.arrayContaining([post.id, updates.caption])
      );
      expect(result).toBeInstanceOf(Post);
      expect(result.caption).toBe(updates.caption);
    });

    it('should return unchanged post when no valid updates', async () => {
      const post = new Post({
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      const result = await post.update({});

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toBe(post);
    });

    it('should filter out id and created_at from updates', async () => {
      const post = new Post({
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      const updates = {
        id: 'should-be-ignored',
        created_at: new Date(),
        caption: 'Valid update'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ ...post, ...updates }] });

      await post.update(updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET caption = $2'),
        expect.arrayContaining([post.id, updates.caption])
      );
    });
  });

  describe('delete', () => {
    it('should delete post successfully', async () => {
      const post = new Post({
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await post.delete();

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM posts WHERE id = $1',
        [post.id]
      );
    });
  });

  describe('incrementLikes', () => {
    it('should increment likes count', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updatedPost = { id: postId, likes_count: 6 };

      mockQuery.mockResolvedValueOnce({ rows: [updatedPost] });

      const result = await Post.incrementLikes(postId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('likes_count = likes_count + 1'),
        [postId]
      );
      expect(result).toBeInstanceOf(Post);
      expect(result.likes_count).toBe(6);
    });

    it('should return null when post not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Post.incrementLikes('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('decrementLikes', () => {
    it('should decrement likes count', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updatedPost = { id: postId, likes_count: 4 };

      mockQuery.mockResolvedValueOnce({ rows: [updatedPost] });

      const result = await Post.decrementLikes(postId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('likes_count = GREATEST(likes_count - 1, 0)'),
        [postId]
      );
      expect(result).toBeInstanceOf(Post);
      expect(result.likes_count).toBe(4);
    });

    it('should return null when post not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await Post.decrementLikes('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('createTable', () => {
    it('should create posts table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await Post.createTable();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS posts')
      );
    });
  });
});