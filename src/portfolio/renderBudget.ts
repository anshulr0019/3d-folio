/** Hysteresis prevents resizing on individual slow frames or oscillating around the target. */
export class RenderBudget {
  scale = 1;
  private slow = 0;
  private fast = 0;
  reset() { this.scale = 1; this.slow = this.fast = 0; }
  sample(fps: number) {
    this.slow = fps < 50 ? this.slow + 1 : 0;
    this.fast = fps >= 58 ? this.fast + 1 : 0;
    const previous = this.scale;
    if (this.slow >= 2) { this.scale = Math.max(0.7, Math.round((this.scale - 0.1) * 10) / 10); this.slow = 0; }
    if (this.fast >= 4) { this.scale = Math.min(1, Math.round((this.scale + 0.1) * 10) / 10); this.fast = 0; }
    return previous !== this.scale;
  }
}
