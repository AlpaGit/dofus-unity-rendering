import ColorUtils from '../utils/ColorUtils.js';
import Animation from '../Animation.js';
import BytesUtils from '../utils/BytesUtils.js';

export default class RenderState {
    constructor() {
        this.Reset();
    }

    /**
     * Parses the animation data to populate RenderState properties.
     * @param {Uint8Array} animationData - The binary animation data.
     * @param {number} dataPosition - The starting byte position for parsing.
     * @returns {number} The updated byte position after parsing.
     */
    compute(animationData, dataPosition) {
        if (!animationData) {
            throw new Error("animationData is null or undefined.");
            // In C++, sub_18076B300(this, 0LL, dataPosition, dataPosition);
            // Here, throwing an error as a placeholder
        }

        const dataView = new DataView(animationData.buffer, animationData.byteOffset, animationData.byteLength);
        const max_length = animationData.length;

        if (dataPosition >= max_length) {
            throw new Error("dataPosition exceeds animationData length.");
            // In C++, goto LABEL_28 which calls sub_18076B2F0();
            // Here, throwing an error as a placeholder
        }

        const v8 = animationData[dataPosition];
        // Handle alpha if flag 0x02 is set
        if ((v8 & 0x02) !== 0) {
            if (dataPosition + 1 >= max_length) {
                throw new Error("Insufficient data for alpha.");
            }
            this.alpha = animationData[dataPosition + 1];
        }

        const v9 = v8;
        let v10 = dataPosition + 2;
        const v11 = (dataPosition + 2) % 4;
        if (v11 !== 0) {
            v10 = BytesUtils.alignTo4Bytes(v10);
        }

        // Handle spriteIndex, customisationIndex, childrenRecursiveCount if flags 0x21 are set
        if ((v9 & 0x21) !== 0) {
            if (v10 + 6 > max_length) {
                throw new Error("Insufficient data for spriteIndex, customisationIndex, and childrenRecursiveCount.");
            }

            this.spriteIndex = BytesUtils.readInt16(dataView, v10);
            this.customisationIndex = BytesUtils.readInt16(dataView, v10 + 2);
            this.childrenRecursiveCount = BytesUtils.readInt16(dataView, v10 + 4);

            v10 += 6;
            if (v10 % 4 !== 0) {
                v10 = BytesUtils.alignTo4Bytes(v10);
            }
        }

        // Handle multiplicativeColor if flag 0x04 is set
        if ((v9 & 0x04) !== 0) {
            if (v10 + 4 > max_length) {
                throw new Error("Insufficient data for multiplicativeColor.");
            }
            this.multiplicativeColor = BytesUtils.readUint32(dataView, v10);
            v10 += 4;
        }

        // Handle additiveColor if flag 0x08 is set
        if ((v9 & 0x08) !== 0) {
            if (v10 + 4 > max_length) {
                throw new Error("Insufficient data for additiveColor.");
            }
            this.additiveColor = BytesUtils.readUint32(dataView, v10);
            v10 += 4;
        }

        // Handle transformation matrices if flag 0x10 is set
        if ((v9 & 0x10) !== 0) {
            if (v10 + 24 > max_length) {
                throw new Error("Insufficient data for transformation matrices.");
            }
            this.m00 = BytesUtils.readFloat32(dataView, v10);
            this.m01 = BytesUtils.readFloat32(dataView, v10 + 4);
            this.m03 = BytesUtils.readFloat32(dataView, v10 + 8);
            this.m10 = BytesUtils.readFloat32(dataView, v10 + 12);
            this.m11 = BytesUtils.readFloat32(dataView, v10 + 16);
            this.m13 = BytesUtils.readFloat32(dataView, v10 + 20);
            v10 += 24;
        }

        // Handle maskFlags if flag 0x40 is set
        if ((v9 & 0x40) !== 0) {
            if (v10 + 1 > max_length) {
                throw new Error("Insufficient data for maskFlags.");
            }
            this.maskFlags = animationData[v10];
            v10 += 1;
        }

        // Interpret v9 as signed char to check if negative
        const signed_v9 = v9 >= 128 ? v9 - 256 : v9;
        if (signed_v9 < 0) {
            // Call ComputeExtendedFilterAndBlendState
            v10 = this.computeExtendedFilterAndBlendState(animationData, v10);
        }

        return v10;

    }


    /**
     * Parses extended filter and blend state data from the animation data.
     * @param {Uint8Array} animationData - The binary animation data.
     * @param {number} dataPosition - The current byte position for parsing.
     * @returns {number} The updated byte position after parsing.
     */
    computeExtendedFilterAndBlendState(animationData, dataPosition) {
        const dataView = new DataView(animationData.buffer, animationData.byteOffset, animationData.byteLength);
        const max_length = animationData.length;

        if (dataPosition >= max_length) {
            throw new Error("dataPosition exceeds animationData length in extended parsing.");
        }

        const blendMode = animationData[dataPosition];
        this.blendMode = blendMode;
        dataPosition += 1;

        // Example Implementation:
        // Assuming blendMode indicates how to parse the following data
        // For demonstration, we'll handle specific blend modes
        // In practice, adjust based on actual data specifications

        while (blendMode > 0) {
            if (dataPosition >= max_length) {
                throw new Error("Insufficient data for filters.");
            }

            const filterType = animationData[dataPosition];
            dataPosition += 1;

            switch (filterType) {
                case 1: // Drop Shadow
                    if (dataPosition + 16 > max_length) {
                        throw new Error("Insufficient data for Drop Shadow filter.");
                    }
                    this.dropShadow = {
                        offsetX: readFloat32(dataView, dataPosition),
                        offsetY: readFloat32(dataView, dataPosition + 4),
                        blurRadius: readFloat32(dataView, dataPosition + 8),
                        color: readUint32(dataView, dataPosition + 12)
                    };
                    dataPosition += 16; // 4 floats: 16 bytes
                    break;
                case 2: // Blur
                    if (dataPosition + 4 > max_length) {
                        throw new Error("Insufficient data for Blur filter.");
                    }
                    this.blur = {
                        blurRadius: readFloat32(dataView, dataPosition)
                    };
                    dataPosition += 4; // 1 float: 4 bytes
                    break;
                case 4: // Glow
                    if (dataPosition + 12 > max_length) {
                        throw new Error("Insufficient data for Glow filter.");
                    }
                    this.glow = {
                        intensity: readFloat32(dataView, dataPosition),
                        color: readUint32(dataView, dataPosition + 4),
                        spread: readFloat32(dataView, dataPosition + 8)
                    };
                    dataPosition += 12; // 3 floats: 12 bytes
                    break;
                default:
                    throw new Error(`Unknown filter type: ${filterType}`);
            }

            // Update blendMode if multiple filters are encoded
            // This depends on how blendMode is represented in the data
            // For simplicity, assuming one filter per call
            break;
        }

        return dataPosition;
    }
    Reset() {
        this.m00 = 1.0;
        this.m01 = 0.0;
        this.m03 = 0.0;
        this.m10 = 0.0;
        this.m11 = 1.0;
        this.m13 = 0.0;
        this.spriteIndex = -1;
        this.alpha = 255; // Equivalent to byte.MaxValue
        this.multiplicativeColor = ColorUtils.ColorHelpers.SWFColorOpaqueWhite;
        this.additiveColor = ColorUtils.ColorHelpers.SWFColorTransparentBlack;
        this.maskFlags = Animation.MaskFlags.None;
        this.blendMode = Animation.BlendMode.Normal; // Set default blend mode if applicable
        this.colorMatrix = null;
        this.customisationIndex = -1;
        this.childrenRecursiveCount = 0;
    }
}