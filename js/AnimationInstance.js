import AnimationLabel from './AnimationLabel.js';

export default class AnimationInstance {
    constructor(guid, data) {
        this.Guid = guid;
        this.referenceCount = 0;

        const dataView = new DataView(data);
        let startIndex = 0;

        // Read Header Information
        this.FrameCount = dataView.getUint16(startIndex, true); // Little-endian
        startIndex += 2;

        this.NodeCount = dataView.getUint16(startIndex, true);
        startIndex += 2;

        this.LabelCount = dataView.getUint16(startIndex, true);
        startIndex += 2;

        this.CombinedNodeState = dataView.getUint8(startIndex);
        startIndex += 2; // Note: In C# code, after reading a byte at index 6, startIndex is set to 8

        console.log(this.FrameCount, this.NodeCount, this.LabelCount, this.CombinedNodeState);

        // Process Labels
        this.Labels = [];
        if (this.LabelCount > 0) {
            for (let i = 0; i < this.LabelCount; ++i) {
                const pos = dataView.getUint16(startIndex, true);
                const count = dataView.getUint8(startIndex + 2);

                // Read the label string
                const labelBytes = new Uint8Array(data.slice(startIndex + 3, startIndex + 3 + count));
                const label = new TextDecoder('utf-8').decode(labelBytes);

                this.Labels.push(new AnimationLabel(pos, label));

                startIndex = startIndex + 3 + count;

                // Align startIndex to the next even number
                if (startIndex % 2 !== 0) {
                    startIndex += 1;
                }
            }

            // Align startIndex to the next multiple of 4
            while (startIndex % 4 !== 0) {
                startIndex += 1;
            }
        }

        // Read Frame Data Positions
        this.FrameDataPositions = [];
        for (let i = 0; i < this.FrameCount; ++i) {
            const frameDataPosition = dataView.getInt32(startIndex, true);
            this.FrameDataPositions.push(frameDataPosition);
            startIndex += 4;
        }

        // Store the data
        this.Data = data;
    }

    static async readInstance(fileName){
        const req = await fetch(fileName);
        const data = await req.arrayBuffer();

        const dataView = new DataView(data);
        // we read a string because thats how it's currently stored in unity
        let strLen = dataView.getUint32(0, true);

        let str = new TextDecoder('utf-8').decode(new Uint8Array(data.slice(4, 4 + strLen)));

        let bytesOffset = (4 + strLen + 4);

        if(bytesOffset % 4 !== 0){
            bytesOffset += 4 - (bytesOffset % 4);
        }

        return new AnimationInstance(fileName, data.slice(bytesOffset));
    }
}