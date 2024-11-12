export default class Vector2 {
    // Public fields
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // Static method to return positive infinity vector
    static positiveInfinity() {
        return new Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    }

    // Static method to return negative infinity vector
    static negativeInfinity() {
        return new Vector2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    }

    // Static method to find the minimum of two vectors
    static Min(a: Vector2, b: Vector2) {
        return new Vector2(Math.min(a.x, b.x), Math.min(a.y, b.y));
    }

    // Static method to find the maximum of two vectors
    static Max(a: Vector2, b: Vector2) {
        return new Vector2(Math.max(a.x, b.x), Math.max(a.y, b.y));
    }

    // Method to add two vectors
    add(other: Vector2) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    // Method to subtract two vectors
    subtract(other: Vector2) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    // Method to multiply vector by scalar
    multiply(scalar: number) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
}