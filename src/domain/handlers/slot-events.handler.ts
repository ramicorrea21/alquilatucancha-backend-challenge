import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SlotBookedEvent } from '../events/slot-booked.event';
import { SlotAvailableEvent } from '../events/slot-cancelled.event';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import * as moment from 'moment';

@Injectable()
@EventsHandler(SlotBookedEvent, SlotAvailableEvent)
export class SlotEventsHandler implements IEventHandler<SlotBookedEvent | SlotAvailableEvent> {
  private readonly logger = new Logger(SlotEventsHandler.name);

  constructor(private readonly cacheService: CacheService) {}

  async handle(event: SlotBookedEvent | SlotAvailableEvent) {
    try {
      const slotDate = moment(event.slot.datetime).format('YYYY-MM-DD');
      
      await this.cacheService.invalidateSlots(
        event.clubId,
        event.courtId,
        slotDate
      );
      
      this.logger.log(
        `Invalidated slots cache for club ${event.clubId}, court ${event.courtId}, date ${slotDate}`
      );
    } catch (error: any) {
      this.logger.error(`Error handling slot event: ${error.message}`);
    }
  }
}