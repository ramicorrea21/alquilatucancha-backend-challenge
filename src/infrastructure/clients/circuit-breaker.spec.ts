import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  
  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
  });

  it('should execute successful operations', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
  });

  it('should use fallback when operation fails and fallback is provided', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('API Error'));
    const result = await circuitBreaker.execute(operation, 'fallback');
    expect(result).toBe('fallback');
  });

  it('should open after reaching failure threshold', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('API Error'));
    
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.execute(operation, 'fallback');
    }

    expect(circuitBreaker.getState()).toBe('OPEN');

    const successOperation = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successOperation, 'fallback');
    expect(result).toBe('fallback');
    expect(successOperation).not.toHaveBeenCalled();
  });

  it('should reset after timeout and allow half-open state', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('API Error'));
    
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.execute(operation, 'fallback');
    }

    jest.useFakeTimers();
    jest.advanceTimersByTime(31000); 

    const successOperation = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successOperation);
    expect(result).toBe('success');
    expect(successOperation).toHaveBeenCalled();
    expect(circuitBreaker.getState()).toBe('CLOSED');

    jest.useRealTimers();
  });

  it('should throw error when no fallback is provided and circuit is open', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('API Error'));
    
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.execute(operation, 'fallback');
    }

    await expect(circuitBreaker.execute(operation))
      .rejects
      .toThrow('Circuit breaker is OPEN');
  });
});