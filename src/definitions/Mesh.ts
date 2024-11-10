import type {SkinAssetValue, Vertex} from "~/src/definitions/SkinAsset";
import type RenderState from "~/src/rendering/RenderState";

export interface Mesh {
    nodeNum: number,
    part: SkinAssetValue,
    renderState: RenderState,
    vertex: Vertex[],
    indices: number[],
}