import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private tokenBucket: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; 
  private readonly queue: Array<{
    resolve: (value: void) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(requestsPerMinute: number = 60) {
    this.maxTokens = requestsPerMinute;
    this.tokenBucket = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerMinute / (60 * 1000); 
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    
    this.tokenBucket = Math.min(this.maxTokens, this.tokenBucket + tokensToAdd);
    this.lastRefill = now;
  }

  private processQueue() {
    while (this.queue.length > 0 && this.tokenBucket > 0) {
      const request = this.queue.shift();
      if (request) {
        this.tokenBucket--;
        request.resolve();
      }
    }
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokenBucket > 0) {
      this.tokenBucket--;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Rate limit request timeout'));
        }
      }, 5000); 

      this.queue.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }
}