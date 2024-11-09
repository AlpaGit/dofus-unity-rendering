
import Vector2 from './Vector2.js';

export default class Bounds {
    constructor(center, size) {
        this.center = center;
        this.size = size;
    }

    // Getter for min
    get min() {
        const halfSize = this.size.multiply(0.5);
        return this.center.subtract(halfSize);
    }

    // Getter for max
    get max() {
        const halfSize = this.size.multiply(0.5);
        return this.center.add(halfSize);
    }

    encapsulate(bounds) {
        // Calculate new min and max
        const newMin = Vector2.Min(this.min, bounds.min);
        const newMax = Vector2.Max(this.max, bounds.max);

        // Update center and size
        this.center = newMin.add(newMax).multiply(0.5);
        this.size = newMax.subtract(newMin);
    }
}