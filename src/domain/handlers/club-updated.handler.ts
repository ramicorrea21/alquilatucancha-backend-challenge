import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ClubUpdatedEvent } from '../events/club-updated.event';
import { CacheService } from 'src/infrastructure/cache/cache.service';


@EventsHandler(ClubUpdatedEvent)
@Injectable()
export class ClubUpdatedHandler implements IEventHandler<ClubUpdatedEvent> {
  private readonly logger = new Logger(ClubUpdatedHandler.name);

  constructor(private readonly cacheService: CacheService) {}

  async handle(event: ClubUpdatedEvent) {
    try {
      if (event.fields.includes('openhours')) {
        await this.cacheService.invalidateClub(event.clubId);
        this.logger.log(`Invalidated all cache for club ${event.clubId} due to openhours update`);
      } else {
        await this.cacheService.invalidateClubInfo(event.clubId);
        this.logger.log(`Invalidated basic info for club ${event.clubId}`);
      }
    } catch (error: any) {
      this.logger.error(`Error handling club update: ${error.message}`);
    }
  }
}