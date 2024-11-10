import ColorUtils from '../utils/ColorUtils';
import Animation from '../Animation';
import BytesUtils from '../utils/BytesUtils';


export default class RenderState {
    public m00: number = 1.0;
    public m01: number = 0.0;
    public m03: number = 0.0;
    public m10: number = 0.0;
    public m11: number = 1.0;
    public m13: number = 0.0;
    public spriteIndex: number = -1;
    public customisationIndex: number = -1;
    public childrenRecursiveCount: number = 0;
    public alpha: number = 255;
    public multiplicativeColor: number = ColorUtils.ColorHelpers.SWFColorOpaqueWhite;
    public additiveColor: number = ColorUtils.ColorHelpers.SWFColorTransparentBlack;

    public maskFlags: number = Animation.MaskFlags.None;
    public blendMode: number = Animation.BlendMode.Normal;

    public colorMatrix: Uint8Array[] | null  = null;

    constructor() {
        this.Reset();
    }
    /**
     * Parses the animation data to populate RenderState properties.
     * @param {Uint8Array} animationData - The binary animation data.
     * @param {number} dataPosition - The starting byte position for parsing.
     * @returns {number} The updated byte position after parsing.
     */
    compute(animationData: Uint8Array, dataPosition: number): number {
        if (!animationData) {
            throw new Error("animationData is null or undefined.");
            // In C++, sub_18076B300(this, 0LL, dataPosition, dataPosition);
            // Here, throwing an error as a placeholder
        }

        const dataView = new DataView(animationData.buffer, animationData.byteOffset, animationData.byteLength);

        let currentByte = animationData[dataPosition];
        let currentPos = dataPosition;

        const maxLength = animationData.length;

        if (dataPosition >= maxLength) {
            throw new Error("dataPosition exceeds animationData length.");
            // In C++, goto LABEL_28 which calls sub_18076B2F0();
            // Here, throwing an error as a placeholder
        }

        if ((currentByte & 2) !== 0) {
            if (currentPos + 1 >= maxLength)
                throw new Error("Insufficient data for alpha.");

            this.alpha = animationData[currentPos + 1];
        }

        currentPos += 2;
        currentPos = currentPos + (4 - (currentPos % 4)) % 4;

        if (currentByte & 0x21) {
            if (currentPos + 6 > maxLength) {
                throw new Error("Insufficient data for spriteIndex, customisationIndex, and childrenRecursiveCount.");
            }

            this.spriteIndex = animationData[currentPos] | (animationData[currentPos + 1] << 8);
            this.customisationIndex = animationData[currentPos + 2] | (animationData[currentPos + 3] << 8);
            this.childrenRecursiveCount = animationData[currentPos + 4] | (animationData[currentPos + 5] << 8);
            currentPos += 6;

            currentPos = currentPos + (4 - (currentPos % 4)) % 4;
        }


        if ((currentByte & 4) !== 0) {
            if (currentPos + 4 > maxLength)
                throw new Error("Insufficient data for multiplicativeColor.");

            this.multiplicativeColor = BytesUtils.readUint32(dataView, currentPos);
            currentPos += 4;
        }

        if ((currentByte & 8) !== 0) {
            if (currentPos + 4 > maxLength) {
                throw new Error("Insufficient data for additiveColor.");
            }
            this.additiveColor = BytesUtils.readUint32(dataView, currentPos);
            currentPos += 4;
        }

        // Handle transformation matrices if flag 0x10 is set

        if ((currentByte & 0x10) !== 0) {
            if (currentPos + 24 > maxLength)
                throw new Error("Insufficient data for transformation matrices.");

            this.m00 = BytesUtils.readFloat32(dataView, currentPos);
            this.m01 = BytesUtils.readFloat32(dataView, currentPos + 4);
            this.m03 = BytesUtils.readFloat32(dataView, currentPos + 8);
            this.m10 = BytesUtils.readFloat32(dataView, currentPos + 12);
            this.m11 = BytesUtils.readFloat32(dataView, currentPos + 16);
            this.m13 = BytesUtils.readFloat32(dataView, currentPos + 20);
            currentPos += 24;
        }

        if ((currentByte & 64) !== 0) {
            if (currentPos + 4 > maxLength)
                throw new Error("Insufficient data for maskFlags.");

            this.maskFlags = animationData[currentPos];
            currentPos += 4;
        }

        let signedCurrentByte = BytesUtils.toSignedByte(currentByte);
        if (signedCurrentByte < 0) {
            return this.computeExtendedFilterAndBlendState(animationData, currentPos+3);
        }

        return currentPos;
    }


    /**
     * Parses extended filter and blend state data from the animation data.
     * @param {Uint8Array} animationData - The binary animation data.
     * @param {number} dataPosition - The current byte position for parsing.
     * @returns {number} The updated byte position after parsing.
     */
    computeExtendedFilterAndBlendState(animationData: Uint8Array, dataPosition: number): number {
        const dataView = new DataView(animationData.buffer, animationData.byteOffset, animationData.byteLength);
        const max_length = animationData.length;

        if (dataPosition >= max_length) {
            throw new Error("dataPosition exceeds animationData length in extended parsing.");
        }


        let currentPos = dataPosition;

        this.blendMode = animationData[currentPos++];

        if ((animationData[dataPosition] & 0x40) !== 0) {
            this.colorMatrix = new Array(5).fill(null);
            for (let i = 0; i < 5; i++) {
                this.colorMatrix[i] = animationData.slice(currentPos, currentPos + 16);
            }

            currentPos += 80;
        }

        const filterCount = animationData[currentPos++];
        for (let i = 0; i < filterCount; i++) {
            if (currentPos >= animationData.length) break;
            const filterType = animationData[currentPos++];
            currentPos = BytesUtils.alignTo4Bytes(currentPos);

            switch (filterType) {
                case 1:
                    currentPos = this.computeDropShadowFilterState(animationData, currentPos);
                    break;
                case 2:
                    currentPos = this.computeBlurFilterState(animationData, currentPos);
                    break;
                case 4:
                    currentPos = this.computeGlowFilterState(animationData, currentPos);
                    break;
            }
        }

        return currentPos % 4 === 0 ? currentPos : currentPos + (4 - (currentPos % 4));
    }

    computeBlurFilterState(animationData: Uint8Array, dataPosition: number) {
        const blurFilter = {
            horizontal: animationData[dataPosition],
            vertical: animationData[dataPosition + 4],
            strength: animationData[dataPosition + 8],
        };

        return dataPosition + 12;
    }

    computeDropShadowFilterState(animationData: Uint8Array, dataPosition: number) {
        const dropShadowFilter = {
            offsetX: animationData[dataPosition],
            offsetY: animationData[dataPosition + 4],
            color: animationData.slice(dataPosition + 8, dataPosition + 12),
            strength: animationData[dataPosition + 12],
            quality: animationData[dataPosition + 16],
        };

        return dataPosition + 32;
    }

    computeGlowFilterState(animationData: Uint8Array, dataPosition: number) {
        const glowFilter = {
            color: animationData.slice(dataPosition, dataPosition + 4),
            strength: animationData[dataPosition + 4],
            blurX: animationData[dataPosition + 8],
            blurY: animationData[dataPosition + 12],
            b1: animationData[dataPosition + 16],
            b2: animationData[dataPosition + 17],
            b3: animationData[dataPosition + 18],
            b4: animationData[dataPosition + 20],
        };

        return dataPosition + 24;
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