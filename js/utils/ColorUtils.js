import Color  from './Color.js';

export default class Colorutils {
     static ColorHelpers = {
        SWFColorOpaqueWhite: 0xffffffff,
        SWFColorTransparentBlack: 0x00000000,
    };
    
    // ConvertFromEncodedColor function
    static ConvertFromEncodedColor(encodedColor) {
        // Helper function to convert unsigned byte to signed byte
        function fromUnsignedByte(byte) {
            return (byte >= 128) ? (byte - 256) : byte;
        }
    
        // Unpack each byte
        const redByte = encodedColor & 0xFF;
        const greenByte = (encodedColor >> 8) & 0xFF;
        const blueByte = (encodedColor >> 16) & 0xFF;
        const alphaByte = (encodedColor >> 24) & 0xFF;
    
        // Convert to signed bytes
        const red = fromUnsignedByte(redByte);
        const green = fromUnsignedByte(greenByte);
        const blue = fromUnsignedByte(blueByte);
        const alpha = fromUnsignedByte(alphaByte);
    
        // Normalize to [0, 1] range
        const r = red / 128.0;
        const g = green / 128.0;
        const b = blue / 128.0;
        const a = alpha / 128.0;
    
        return new Color(r, g, b, a);
    }

    // ConvertSWFColor function
    // ConvertSWFColor function
    static ConvertSWFColor(r, g, b, a = 1.0) {
        // Helper function to clamp and floor the value
        function clampAndFloor(val) {
            return Math.max(Math.min(Math.floor(val * 128), 127), -128);
        }

        // Helper function to convert signed byte to unsigned byte
        function toUnsignedByte(sbyte) {
            return (sbyte < 0) ? (256 + sbyte) : sbyte;
        }

        // Clamp and floor each component
        const redSByte = clampAndFloor(r);
        const greenSByte = clampAndFloor(g);
        const blueSByte = clampAndFloor(b);
        const alphaSByte = clampAndFloor(a);

        // Convert to unsigned bytes
        const redByte = toUnsignedByte(redSByte);
        const greenByte = toUnsignedByte(greenSByte);
        const blueByte = toUnsignedByte(blueSByte);
        const alphaByte = toUnsignedByte(alphaSByte);

        // Pack into a 32-bit unsigned integer
        const color = (redByte | (greenByte << 8) | (blueByte << 16) | (alphaByte << 24)) >>> 0;

        return color;
    }
}
