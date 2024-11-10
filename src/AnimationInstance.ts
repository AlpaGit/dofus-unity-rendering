import AnimationLabel from './AnimationLabel.js';

export default class AnimationInstance {
    public guid: string;
    public referenceCount: number;

    public frameCount: number;
    public nodeCount: number;
    public labelCount: number;
    public combinedNodeState: number;

    public labels: AnimationLabel[];
    public frameDataPositions: number[];

    public data: ArrayBuffer;

    constructor(guid: string, data: ArrayBuffer) {
        this.guid = guid;
        this.referenceCount = 0;

        const dataView = new DataView(data);
        let startIndex = 0;

        // Read Header Information
        this.frameCount = dataView.getUint16(startIndex, true); // Little-endian
        startIndex += 2;

        this.nodeCount = dataView.getUint16(startIndex, true);
        startIndex += 2;

        this.labelCount = dataView.getUint16(startIndex, true);
        startIndex += 2;

        this.combinedNodeState = dataView.getUint8(startIndex);
        startIndex += 2; // Note: In C# code, after reading a byte at index 6, startIndex is set to 8

        // Process Labels
        this.labels = [];
        if (this.labelCount > 0) {
            for (let i = 0; i < this.labelCount; ++i) {
                const pos = dataView.getUint16(startIndex, true);
                const count = dataView.getUint8(startIndex + 2);

                // Read the label string
                const labelBytes = new Uint8Array(data.slice(startIndex + 3, startIndex + 3 + count));
                const label = new TextDecoder('utf-8').decode(labelBytes);

                this.labels.push(new AnimationLabel(pos, label));

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
        this.frameDataPositions = [];
        for (let i = 0; i < this.frameCount; ++i) {
            const frameDataPosition = dataView.getInt32(startIndex, true);
            this.frameDataPositions.push(frameDataPosition);
            startIndex += 4;
        }

        // Store the data
        this.data = data;
    }

    /// Read the header of UABE file which is just the name of the file and the data
    static async readInstance(fileName: string): Promise<AnimationInstance> {
        const req = await fetch(fileName);
        const data = await req.arrayBuffer();

        const dataView = new DataView(data);
        let strLen = dataView.getUint32(0, true);

        let str = new TextDecoder('utf-8').decode(new Uint8Array(data.slice(4, 4 + strLen)));

        let bytesOffset = (4 + strLen + 4);

        if(bytesOffset % 4 !== 0){
            bytesOffset += 4 - (bytesOffset % 4);
        }

        return new AnimationInstance(fileName, data.slice(bytesOffset));
    }
}