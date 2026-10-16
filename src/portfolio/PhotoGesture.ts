/** Pointer ownership keeps a second finger from replacing an active orbit drag. */
export class PhotoGesture {
  private pointers = new Map<number, { x: number; y: number }>();

  begin(id: number, x: number, y: number) {
    if (this.pointers.size >= 2) return false;
    this.pointers.set(id, { x, y });
    return true;
  }

  move(id: number, x: number, y: number) {
    const previous = this.pointers.get(id);
    if (!previous) return null;
    const other = [...this.pointers.entries()].find(([key]) => key !== id)?.[1];
    this.pointers.set(id, { x, y });
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(x - other.x, y - other.y);
      return { dx: 0, dy: 0, zoom: before > 4 && after > 4 ? before / after : 1 };
    }
    return { dx: x - previous.x, dy: y - previous.y, zoom: 1 };
  }

  end(id: number) { this.pointers.delete(id); }
  clear() { this.pointers.clear(); }
}
