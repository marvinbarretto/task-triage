import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SsrPlatformService } from './platform.service';

describe('SsrPlatformService', () => {
  let service: SsrPlatformService;

  describe('Browser Environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });
      service = TestBed.inject(SsrPlatformService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should detect browser platform', () => {
      expect(service.isBrowser).toBe(true);
      expect(service.isServer).toBe(false);
    });

    it('should return window object in browser', () => {
      expect(service.getWindow()).toBeDefined();
    });

    it('should execute browser-only callbacks', () => {
      const result = service.onlyOnBrowser(() => 'browser-data');
      expect(result).toBe('browser-data');
    });
  });

  describe('Server Environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      service = TestBed.inject(SsrPlatformService);
    });

    it('should detect server platform', () => {
      expect(service.isBrowser).toBe(false);
      expect(service.isServer).toBe(true);
    });

    it('should return undefined for window in SSR', () => {
      expect(service.getWindow()).toBeUndefined();
    });

    it('should not execute browser-only callbacks in SSR', () => {
      const result = service.onlyOnBrowser(() => 'browser-data');
      expect(result).toBeUndefined();
    });
  });
});
