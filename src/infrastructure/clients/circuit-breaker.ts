import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  
  private readonly failureThreshold = 5; 
  private readonly resetTimeout = 30000; 
  
  async execute<T>(
    operation: () => Promise<T>,
    fallback: T | null = null
  ): Promise<T> {
    if (this.shouldAllowRequest()) {
      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure();
        if (fallback !== null) {
          return fallback;
        }
        throw error;
      }
    } else if (fallback !== null) {
      this.logger.warn('Circuit breaker is OPEN, using fallback');
      return fallback;
    }
    
    throw new Error('Circuit breaker is OPEN');
  }

  private shouldAllowRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.logger.log('Circuit breaker entering HALF-OPEN state');
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    return true; 
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker returning to CLOSED state');
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.logger.warn(`Circuit breaker opening after ${this.failures} failures`);
      this.state = CircuitState.OPEN;
    }
  }

  getState(): string {
    return CircuitState[this.state];
  }
}