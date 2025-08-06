import { jest } from '@jest/globals';

const { validateRequest, createPostSchema, updatePostSchema, likePostSchema } = 
  await import('../../src/middleware/validation.js');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should call next() when validation passes', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({ error: null })
      };

      const middleware = validateRequest(mockSchema);
      req.body = { test: 'data' };

      middleware(req, res, next);

      expect(mockSchema.validate).toHaveBeenCalledWith(req.body);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 error when validation fails', () => {
      const validationError = {
        details: [{ message: 'Validation failed' }]
      };

      const mockSchema = {
        validate: jest.fn().mockReturnValue({ error: validationError })
      };

      const middleware = validateRequest(mockSchema);
      req.body = { invalid: 'data' };

      middleware(req, res, next);

      expect(mockSchema.validate).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Validation failed'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createPostSchema', () => {
    it('should validate valid post creation data', () => {
      const validData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'This is a test caption',
        media_file_id: '550e8400-e29b-41d4-a716-446655440001'
      };

      const { error } = createPostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should validate with minimal required data', () => {
      const validData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: ''
      };

      const { error } = createPostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should reject missing user_id', () => {
      const invalidData = {
        caption: 'Test caption'
      };

      const { error } = createPostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('user_id');
      expect(error.details[0].message).toContain('required');
    });

    it('should reject invalid user_id format', () => {
      const invalidData = {
        user_id: 'invalid-uuid',
        caption: 'Test caption'
      };

      const { error } = createPostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid GUID');
    });

    it('should reject caption that is too long', () => {
      const invalidData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'a'.repeat(2001) // exceeds 2000 character limit
      };

      const { error } = createPostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('2000');
    });

    it('should reject invalid media_file_id format', () => {
      const invalidData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption',
        media_file_id: 'invalid-uuid'
      };

      const { error } = createPostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid GUID');
    });

    it('should allow empty caption', () => {
      const validData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: ''
      };

      const { error } = createPostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should allow missing media_file_id', () => {
      const validData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Test caption'
      };

      const { error } = createPostSchema.validate(validData);

      expect(error).toBeUndefined();
    });
  });

  describe('updatePostSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        caption: 'Updated caption'
      };

      const { error } = updatePostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should validate with empty caption', () => {
      const validData = {
        caption: ''
      };

      const { error } = updatePostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should validate with no data (all optional)', () => {
      const validData = {};

      const { error } = updatePostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should reject caption that is too long', () => {
      const invalidData = {
        caption: 'a'.repeat(2001) // exceeds 2000 character limit
      };

      const { error } = updatePostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('2000');
    });
  });

  describe('likePostSchema', () => {
    it('should validate valid like data', () => {
      const validData = {
        user_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const { error } = likePostSchema.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should reject missing user_id', () => {
      const invalidData = {};

      const { error } = likePostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('user_id');
      expect(error.details[0].message).toContain('required');
    });

    it('should reject invalid user_id format', () => {
      const invalidData = {
        user_id: 'invalid-uuid'
      };

      const { error } = likePostSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid GUID');
    });
  });
});