// Error codes
export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// Error response
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: Date;
    requestId: string;
  };
}

// Retry policy
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'EXPONENTIAL' | 'LINEAR';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCode[];
}

// Default retry policy
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'EXPONENTIAL',
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryableErrors: [ErrorCode.SERVICE_UNAVAILABLE, ErrorCode.RATE_LIMIT_EXCEEDED],
};

// Security event
export interface SecurityEvent {
  eventType: 'UNAUTHORIZED_ACCESS' | 'FAILED_LOGIN' | 'DATA_BREACH' | 'SUSPICIOUS_ACTIVITY';
  userId?: string;
  ipAddress: string;
  timestamp: Date;
  details: any;
}
