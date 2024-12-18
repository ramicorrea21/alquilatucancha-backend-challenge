import { Test } from '@nestjs/testing';
import { CachedAlquilaTuCanchaClient } from './cached-alquila-tu-cancha.client';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { CacheService } from '../cache/cache.service';

describe('CachedAlquilaTuCanchaClient', () => {
  let cachedClient: CachedAlquilaTuCanchaClient;
  let mockClient: jest.Mocked<AlquilaTuCanchaClient>;
  let mockCacheService: Partial<CacheService>;

  beforeEach(async () => {
    mockClient = {
      getClubs: jest.fn(),
      getCourts: jest.fn(),
      getAvailableSlots: jest.fn(),
    };

    mockCacheService = {
      getClubs: jest.fn(),
      setClubs: jest.fn(),
      getCourts: jest.fn(),
      setCourts: jest.fn(),
      getSlots: jest.fn(),
      setSlots: jest.fn(),
      invalidateClub: jest.fn(),
      invalidateClubInfo: jest.fn(),
      invalidateCourt: jest.fn(),
      invalidateSlots: jest.fn(),
    };

    cachedClient = new CachedAlquilaTuCanchaClient(
      mockClient, 
      mockCacheService as CacheService
    );
  });

  describe('getClubs', () => {
    it('should return cached data when available', async () => {
      const cachedClubs = [{ id: 1, name: 'Club 1' }];
      (mockCacheService.getClubs as jest.Mock).mockResolvedValue(cachedClubs);

      const result = await cachedClient.getClubs('123');
      
      expect(result).toEqual(cachedClubs);
      expect(mockClient.getClubs).not.toHaveBeenCalled();
    });

    it('should fetch and cache data when not in cache', async () => {
      const clubs = [{ id: 1, name: 'Club 1' }];
      (mockCacheService.getClubs as jest.Mock).mockResolvedValue(null);
      mockClient.getClubs.mockResolvedValue(clubs);

      const result = await cachedClient.getClubs('123');
      
      expect(result).toEqual(clubs);
      expect(mockCacheService.setClubs).toHaveBeenCalledWith('123', clubs);
    });

    it('should return empty array when API fails and circuit opens', async () => {
      (mockCacheService.getClubs as jest.Mock).mockResolvedValue(null);
      mockClient.getClubs.mockRejectedValue(new Error('API Error'));

      for (let i = 0; i < 6; i++) {
        const result = await cachedClient.getClubs('123');
        expect(result).toEqual([]);
      }

      expect(mockClient.getClubs).toHaveBeenCalledTimes(5);
    });
  });
});