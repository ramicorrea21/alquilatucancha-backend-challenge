import { Injectable, Logger } from '@nestjs/common';
import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  
  // In-memory storage
  private clubsCache = new Map<string, { data: Club[], timestamp: number }>();
  private courtsCache = new Map<number, { data: Court[], timestamp: number }>();
  private slotsCache = new Map<string, { data: Slot[], timestamp: number }>();

  // TTL in milliseconds (1 hour for demonstration)
  private readonly TTL = 60 * 60 * 1000;

  // Clubs
  async getClubs(placeId: string): Promise<Club[] | null> {
    const cached = this.clubsCache.get(placeId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.clubsCache.delete(placeId);
      return null;
    }
    
    return cached.data;
  }

  async setClubs(placeId: string, clubs: Club[]): Promise<void> {
    this.clubsCache.set(placeId, {
      data: clubs,
      timestamp: Date.now()
    });
    this.logger.debug(`Cached clubs for placeId: ${placeId}`);
  }

  // Courts
  async getCourts(clubId: number): Promise<Court[] | null> {
    const cached = this.courtsCache.get(clubId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.courtsCache.delete(clubId);
      return null;
    }
    
    return cached.data;
  }

  async setCourts(clubId: number, courts: Court[]): Promise<void> {
    this.courtsCache.set(clubId, {
      data: courts,
      timestamp: Date.now()
    });
    this.logger.debug(`Cached courts for clubId: ${clubId}`);
  }

  // Slots
  private getSlotsKey(clubId: number, courtId: number, date: string): string {
    return `${clubId}:${courtId}:${date}`;
  }

  async getSlots(clubId: number, courtId: number, date: string): Promise<Slot[] | null> {
    const key = this.getSlotsKey(clubId, courtId, date);
    const cached = this.slotsCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.slotsCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  async setSlots(clubId: number, courtId: number, date: string, slots: Slot[]): Promise<void> {
    const key = this.getSlotsKey(clubId, courtId, date);
    this.slotsCache.set(key, {
      data: slots,
      timestamp: Date.now()
    });
    this.logger.debug(`Cached slots for key: ${key}`);
  }

  // Cache invalidation methods
  async invalidateClub(clubId: number): Promise<void> {
    // Invalidate courts when club is invalidated
    this.courtsCache.delete(clubId);
    this.logger.debug(`Invalidated cache for clubId: ${clubId}`);
  }

  async invalidateClubInfo(clubId: number): Promise<void> {
    const key = `clubs:${clubId}`;
    await this.clubsCache.delete(key);
    this.logger.debug(`Invalidated club info cache for clubId: ${clubId}`);
  }

  async invalidateCourt(clubId: number, courtId: number): Promise<void> {
    // Remove all slots for this court
    const slotsToDelete = Array.from(this.slotsCache.keys())
      .filter(key => key.startsWith(`${clubId}:${courtId}`));
    
    slotsToDelete.forEach(key => this.slotsCache.delete(key));
    this.logger.debug(`Invalidated cache for clubId: ${clubId}, courtId: ${courtId}`);
  }

  async invalidateSlots(clubId: number, courtId: number, date: string): Promise<void> {
    const key = this.getSlotsKey(clubId, courtId, date);
    this.slotsCache.delete(key);
    this.logger.debug(`Invalidated slots cache for key: ${key}`);
  }
}