import { BookingCounterPipe } from './booking-counter.pipe';

describe('BookingCounterPipe', () => {
  it('create an instance', () => {
    const pipe = new BookingCounterPipe();
    expect(pipe).toBeTruthy();
  });
});
