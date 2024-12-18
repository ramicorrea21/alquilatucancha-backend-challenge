import { Injectable, Logger } from '@nestjs/common';
import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { CacheService } from '../cache/cache.service';
import { RateLimiter } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';
import * as moment from 'moment';

@Injectable()
export class CachedAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private readonly logger = new Logger(CachedAlquilaTuCanchaClient.name);
  private readonly rateLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly client: AlquilaTuCanchaClient,
    private readonly cacheService: CacheService,
  ) {
    this.rateLimiter = new RateLimiter(60);
    this.circuitBreaker = new CircuitBreaker();
  }

  private async executeWithProtection<T>(
    operation: () => Promise<T>,
    fallback: T | null = null
  ): Promise<T> {
    return this.circuitBreaker.execute(
      async () => {
        await this.rateLimiter.acquire();
        return operation();
      },
      fallback
    );
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const cachedClubs = await this.cacheService.getClubs(placeId);
    if (cachedClubs) {
      return cachedClubs;
    }

    const clubs = await this.executeWithProtection(
      () => this.client.getClubs(placeId),
      [] 
    );
    
    if (clubs.length > 0) {
      await this.cacheService.setClubs(placeId, clubs);
    }
    
    return clubs;
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cachedCourts = await this.cacheService.getCourts(clubId);
    if (cachedCourts) {
      return cachedCourts;
    }

    const courts = await this.executeWithProtection(
      () => this.client.getCourts(clubId),
      [] 
    );
    
    if (courts.length > 0) {
      await this.cacheService.setCourts(clubId, courts);
    }
    
    return courts;
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const dateStr = moment(date).format('YYYY-MM-DD');
    
    const cachedSlots = await this.cacheService.getSlots(clubId, courtId, dateStr);
    if (cachedSlots) {
      return cachedSlots;
    }

    const slots = await this.executeWithProtection(
      () => this.client.getAvailableSlots(clubId, courtId, date),
      [] 
    );
    
    if (slots.length > 0) {
      await this.cacheService.setSlots(clubId, courtId, dateStr, slots);
    }
    
    return slots;
  }
}