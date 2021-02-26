import { NumberToTimePipe } from './number-to-time.pipe';

describe('NumberToTimePipe', () => {
  it('create an instance', () => {
    const pipe = new NumberToTimePipe();
    expect(pipe).toBeTruthy();
  });
});
