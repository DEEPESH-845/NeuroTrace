/**
 * Mock for react-native-quick-sqlite
 */

export interface QuickSQLiteConnection {
  execute: jest.Mock;
  executeAsync: jest.Mock;
  executeBatch: jest.Mock;
  close: jest.Mock;
}

export const open = jest.fn().mockReturnValue({
  execute: jest.fn().mockReturnValue({ rows: { _array: [], length: 0 } }),
  executeAsync: jest.fn().mockResolvedValue({ rows: { _array: [], length: 0 } }),
  executeBatch: jest.fn().mockResolvedValue([]),
  close: jest.fn(),
});

export const QuickSQLite = {
  open,
};
