import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly logger = new Logger(GetAvailabilityHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    try {
      const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
      
      // Paralel processing
      const clubsWithAvailability = await Promise.all(
        clubs.map(async (club) => {
          try {
            const courts = await this.alquilaTuCanchaClient.getCourts(club.id);
            
            const courtsWithAvailability = await Promise.all(
              courts.map(async (court) => {
                try {
                  const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
                    club.id,
                    court.id,
                    query.date,
                  );
                  
                  return {
                    ...court,
                    available: slots,
                  };
                } catch (error: any) {
                  this.logger.warn(
                    `Failed to get slots for club ${club.id}, court ${court.id}: ${error.message}`,
                  );
                  // In case of error, only return the court without avaiable slots
                  return {
                    ...court,
                    available: [],
                  };
                }
              }),
            );

            return {
              ...club,
              courts: courtsWithAvailability,
            };
          } catch (error: any) {
            this.logger.warn(`Failed to get courts for club ${club.id}: ${error.message}`);
            // In case of error, only return the club without courts
            return {
              ...club,
              courts: [],
            };
          }
        }),
      );

      return clubsWithAvailability;
    } catch (error: any) {
      this.logger.error(`Failed to get availability: ${error.message}`);
      return [];
    }
  }
}