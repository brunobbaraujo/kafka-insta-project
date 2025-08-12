import { jest } from '@jest/globals';

// Mock database connection
export const mockQuery = jest.fn();
export const mockWithTransaction = jest.fn();

// Mock Kafka producer
export const mockKafkaProducer = {
  publishPostCreated: jest.fn().mockResolvedValue(undefined),
  publishPostUpdated: jest.fn().mockResolvedValue(undefined),
  publishPostDeleted: jest.fn().mockResolvedValue(undefined),
  publishPostLiked: jest.fn().mockResolvedValue(undefined),
  publishPostUnliked: jest.fn().mockResolvedValue(undefined),
};

// Mock database module
jest.unstable_mockModule('../src/config/database.js', () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction
}));

// Mock kafka module  
jest.unstable_mockModule('../src/config/kafka.js', () => ({
  default: mockKafkaProducer
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add a dummy test to satisfy Jest's requirement
test('setup file loads correctly', () => {
  expect(true).toBe(true);
});