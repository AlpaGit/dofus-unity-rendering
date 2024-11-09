export default class BytesUtils {
    /**
     * Reads a signed 16-bit integer from the DataView at the specified byte offset.
     * @param {DataView} dataView - The DataView instance.
     * @param {number} offset - The byte offset to read from.
     * @returns {number} The read signed 16-bit integer.
     */
    static readInt16(dataView, offset) {
        return dataView.getInt16(offset, true); // Little-endian
    }

    /**
     * Reads an unsigned 32-bit integer from the DataView at the specified byte offset.
     * @param {DataView} dataView - The DataView instance.
     * @param {number} offset - The byte offset to read from.
     * @returns {number} The read unsigned 32-bit integer.
     */
    static readUint32(dataView, offset) {
        return dataView.getUint32(offset, true); // Little-endian
    }

    /**
     * Reads a 32-bit float from the DataView at the specified byte offset.
     * @param {DataView} dataView - The DataView instance.
     * @param {number} offset - The byte offset to read from.
     * @returns {number} The read 32-bit float.
     */
    static readFloat32(dataView, offset) {
        return dataView.getFloat32(offset, true); // Little-endian
    }

    /**
     * Aligns the given position to the next multiple of 4.
     * @param {number} position - The current byte position.
     * @returns {number} The aligned byte position.
     */
    static alignTo4Bytes(position) {
        return position % 4 === 0 ? position : position - (position % 4) + 4;
    }

    static toSignedByte(n) {
        return n < 128 ? n : n - 256;
    }
}