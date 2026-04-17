export class RefAllocator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `e${this.counter}`;
  }

  reset(): void {
    this.counter = 0;
  }
}
