import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { CourtUpdatedHandler } from './domain/handlers/court-updated.handler';
import { SlotEventsHandler } from './domain/handlers/slot-events.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { CachedAlquilaTuCanchaClient } from './infrastructure/clients/cached-alquila-tu-cancha.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { CacheModule } from './infrastructure/cache/cache.module';
import { CacheService } from './infrastructure/cache/cache.service';

const EventHandlers = [
  ClubUpdatedHandler,
  CourtUpdatedHandler,
  SlotEventsHandler,
];

@Module({
  imports: [
    HttpModule, 
    CqrsModule, 
    ConfigModule.forRoot(),
    CacheModule,
  ],
  controllers: [SearchController, EventsController],
  providers: [
    {
      provide: 'HTTP_CLIENT',
      useClass: HTTPAlquilaTuCanchaClient,
    },
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useFactory: (httpClient, cacheService) => {
        return new CachedAlquilaTuCanchaClient(httpClient, cacheService);
      },
      inject: ['HTTP_CLIENT', CacheService],
    },
    GetAvailabilityHandler,
    ...EventHandlers,
  ],
})
export class AppModule {}