import Vector2 from './Vector2';

export default class Bounds {
    // Public fields
    center: Vector2;
    size: Vector2;

    constructor(center: Vector2, size: Vector2) {
        this.center = center;
        this.size = size;
    }

    // Getter for min
    get min() {
        if(this.size.x === 0 && this.size.y === 0){
            return this.size;
        }

        const halfSize = this.size.multiply(0.5);
        return this.center.subtract(halfSize);
    }

    // Getter for max
    get max() {
        if(this.size.x === 0 && this.size.y === 0){
            return this.size;
        }

        const halfSize = this.size.multiply(0.5);
        return this.center.add(halfSize);
    }

    get minX() {
        return this.min.x;
    }
    get minY() {
        return this.min.y;
    }
    get maxX() {
        return this.max.x;
    }
    get maxY() {
        return this.max.y;
    }

    encapsulate(bounds: Bounds) {
        // Calculate new min and max
        const newMin = Vector2.Min(this.min, bounds.min);
        const newMax = Vector2.Max(this.max, bounds.max);

        // Update center and size
        this.center = newMin.add(newMax).multiply(0.5);
        this.size = newMax.subtract(newMin);
    }
}