/**
 * Binary min-heap priority queue.
 *
 * Used by the spaced-repetition scheduler to always surface the most urgent
 * card in O(log n). Lower `priority` = dequeued first.
 */
export class PriorityQueue<T> {
  private heap: { priority: number; value: T }[] = [];

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  push(value: T, priority: number) {
    this.heap.push({ priority, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.value;
  }

  /** Drain the queue into a priority-ordered array (ascending priority). */
  toSortedArray(): T[] {
    const out: T[] = [];
    while (!this.isEmpty()) out.push(this.pop()!);
    return out;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].priority >= this.heap[parent].priority) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private bubbleDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority)
        smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority)
        smallest = right;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(a: number, b: number) {
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
  }
}
