export class LatestSnapshotWriteQueue<T> {
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly createSnapshot: () => T,
    private readonly writeSnapshot: (snapshot: T) => Promise<void>,
    private readonly handleError: (error: unknown) => void,
  ) {}

  enqueue(throwOnFailure: boolean): Promise<void> {
    const write = this.chain.then(async () => {
      await this.writeSnapshot(this.createSnapshot());
    });
    const handledWrite = write.catch((error: unknown) => {
      this.handleError(error);
    });
    this.chain = handledWrite;
    return throwOnFailure ? write : handledWrite;
  }
}
