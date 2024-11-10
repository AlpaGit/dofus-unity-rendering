import type Vector2 from "~/src/utils/Vector2";

export default interface SkinAsset {
    m_keys: {
        Array: string[];
    }
    m_values: {
        Array: SkinAssetValue[];
    }
    triangles: {
        Array: number[];
    }
    vertices: {
        Array: Vertex[];
    }
}

export interface Vertex {
    pos: Vector2;
    uv: Vector2;
    multiplicativeColor: number;
    additiveColor: number;
}


export interface SkinAssetValue{
    name: string;
    DisplayListEntry: {
        Array: {
            symbolId: number;
            entries: number;
            transform: {
                rX: number;
                uX: number;
                ry: number;
                uY: number;
                tX: number;
                tY: number;
            }
        }[];
    };
    skinChunks: {
        Array: SkinPart[]
    }
}

export interface SkinPart {
    startVertexIndex: number;
    indexCount: number;
    startIndexIndex: number;
    vertexCount: number;
    textureIndex: number;
    maskState: number;
}