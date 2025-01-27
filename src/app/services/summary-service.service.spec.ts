import { TestBed } from '@angular/core/testing';

import { SummaryServiceService } from './summary-service.service';

describe('SummaryServiceService', () => {
  let service: SummaryServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SummaryServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
