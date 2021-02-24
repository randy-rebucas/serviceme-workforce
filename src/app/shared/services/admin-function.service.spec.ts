import { TestBed } from '@angular/core/testing';

import { AdminFunctionService } from './admin-function.service';

describe('AdminFunctionService', () => {
  let service: AdminFunctionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminFunctionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
