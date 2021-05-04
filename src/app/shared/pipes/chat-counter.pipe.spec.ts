import { ChatCounterPipe } from './chat-counter.pipe';

describe('ChatCounterPipe', () => {
  it('create an instance', () => {
    const pipe = new ChatCounterPipe();
    expect(pipe).toBeTruthy();
  });
});
