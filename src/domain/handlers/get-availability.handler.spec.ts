import * as moment from 'moment';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { GetAvailabilityHandler } from './get-availability.handler';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;

  beforeEach(() => {
    client = new FakeAlquilaTuCanchaClient();
    handler = new GetAvailabilityHandler(client);
  });

  it('returns the availability', async () => {
    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.slots = {
      '1_1_2022-12-05': [],
    };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
  });

  it('should handle empty clubs response gracefully', async () => {
    client.clubs = {
      '123': [],
    };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([]);
  });

  it('should handle missing courts gracefully', async () => {
    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [],
    };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [] }]);
  });

  it('should process multiple clubs and courts', async () => {
    const mockSlot: Slot = {
      price: 100,
      duration: 60,
      datetime: '2024-12-18T10:00:00',
      start: '10:00',
      end: '11:00',
      _priority: 1
    };

    client.clubs = {
      '123': [
        { id: 1 },
        { id: 2 }
      ],
    };
    client.courts = {
      '1': [{ id: 1 }, { id: 2 }],
      '2': [{ id: 3 }, { id: 4 }],
    };
    client.slots = {
      '1_1_2022-12-05': [mockSlot],
      '1_2_2022-12-05': [mockSlot],
      '2_3_2022-12-05': [mockSlot],
      '2_4_2022-12-05': [mockSlot],
    };

    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toHaveLength(2);
    expect(response[0].courts).toHaveLength(2);
    expect(response[1].courts).toHaveLength(2);
    expect(response[0].courts[0].available).toHaveLength(1);
  });

  it('should handle errors in getClubs', async () => {
    jest.spyOn(client, 'getClubs').mockRejectedValueOnce(new Error('API Error'));
    
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([]);
  });
});

class FakeAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  clubs: Record<string, Club[]> = {};
  courts: Record<string, Court[]> = {};
  slots: Record<string, Slot[]> = {};
  
  async getClubs(placeId: string): Promise<Club[]> {
    return this.clubs[placeId] || [];
  }
  
  async getCourts(clubId: number): Promise<Court[]> {
    return this.courts[String(clubId)] || [];
  }
  
  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    return this.slots[
      `${clubId}_${courtId}_${moment(date).format('YYYY-MM-DD')}`
    ] || [];
  }
}