import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CourtUpdatedEvent } from '../events/court-updated.event'
import { CacheService } from '../../infrastructure/cache/cache.service';

@EventsHandler(CourtUpdatedEvent)
@Injectable()
export class CourtUpdatedHandler implements IEventHandler<CourtUpdatedEvent> {
  private readonly logger = new Logger(CourtUpdatedHandler.name);

  constructor(private readonly cacheService: CacheService) {}

  async handle(event: CourtUpdatedEvent) {
    this.logger.log(
      `Handling court update for clubId: ${event.clubId}, courtId: ${event.courtId}`,
    );
    
    try {
      await this.cacheService.invalidateCourt(event.clubId, event.courtId);
    } catch (error:any) {
      this.logger.error(`Error handling court update: ${error.message}`, error.stack);
    }
  }
}