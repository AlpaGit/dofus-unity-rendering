import AnimationInstance from './AnimationInstance';
import RenderState from './rendering/RenderState';
import ColorUtils from './utils/ColorUtils';
import Bounds from './utils/Bounds';
import Vector2 from './utils/Vector2';

import fragmentShader from './shaders/fragment.glsl?raw';
import vertexShader from './shaders/vertex.glsl?raw';
import fragmentBoxShader from './shaders/fragmentBox.glsl?raw';
import vertexBoxShader from './shaders/vertexBox.glsl?raw';

import type SkinAsset from "~/src/definitions/SkinAsset";
import type { Vertex } from "~/src/definitions/SkinAsset";
import type { SkinAssetValue } from "~/src/definitions/SkinAsset";
import type {Mesh} from "~/src/definitions/Mesh";
import Mat4 from "~/src/utils/Mat4";


export default class AnimationRenderer {
    public static ASSETS_URL: string = "https://unity.bubble-network.net/Bones/";

    skinId: number = 0;
    animation: string = "";

    skinAsset: SkinAsset | null = null;

    vertexBuffer: Vertex[] = [];
    baseVertexBuffer: Vertex[] = [];
    baseTriangleIndices: number[] = [];
    triangleIndices: number[] = [];
    meshes: Mesh[] = [];

    mouseX: number = 0;
    mouseY: number = 0;

    intervalId: number | null = null;

    canvas: HTMLCanvasElement | null = null;
    gl: WebGLRenderingContext | null = null;

    anim: AnimationInstance | null = null;
    entries: { [key: string] :SkinAssetValue } = {};

    renderStates: RenderState[] = [];

    shaderProgram: WebGLProgram | null = null;
    shaderProgramBox: WebGLProgram | null = null;

    webglTexture: WebGLTexture | null = null;

    scale: number = 1.0;
    boundsAnimation: Bounds| null = null;

    frameRate: number = 25;

    offsetX: number = 0;
    offsetY: number = 0;

    aPosition: number = 0;
    aTexCoord: number = 0;
    aMultiplicativeColor: number = 0;
    aAdditiveColor: number = 0;

    uMatrix: WebGLUniformLocation | null = null;

    constructor(canvas: HTMLCanvasElement, skinId: number, animation: string) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

        if (!this.gl) {
            console.error("WebGL not supported.");
            return;
        }

        this.skinId = skinId;
        this.animation = animation;

        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
    }

    public async Initialize(){
        if(this.gl === null) {
            console.error("WebGL not supported.");
            return;
        }

        const animatedDefinitionReq = await fetch(AnimationRenderer.ASSETS_URL + this.skinId + "/" + this.skinId + "-AnimatedObjectDefinition.json");
        const animatedDefinitionRaw = (await animatedDefinitionReq.text()).replace(
            /:\s*(-?\d{16,})(?=[,\}\]])/g,
            ': "$1"' // Wrap the number in quotes
        );

        const animatedDefinition = JSON.parse(animatedDefinitionRaw);

        if(animatedDefinition === null) {
            console.error("Animated definition not loaded.");
            return;
        }

        this.frameRate = animatedDefinition.defaultFrameRate;


        const skinAssetDataReq = await fetch(AnimationRenderer.ASSETS_URL + this.skinId + "/" + this.skinId + "-" + animatedDefinition.boneAsset.m_PathID + "-SkinAsset.json")
        this.skinAsset = await skinAssetDataReq.json();

        if(this.skinAsset === null) {
            console.error("Skin asset not loaded.");
            return;
        }

        let keys = this.skinAsset.m_keys;
        let values = this.skinAsset.m_values;

        this.entries = {};
        for(let i = 0; i < keys.Array.length; i++) {
            this.entries[keys.Array[i]] = values.Array[i];
        }

        this.anim = await AnimationInstance.readInstance(AnimationRenderer.ASSETS_URL + this.skinId + "/" + this.skinId + "_" + this.animation + ".dat");
        this.renderStates = Array(this.anim.nodeCount).fill(0).map(() => new RenderState());


        this.vertexBuffer = JSON.parse(JSON.stringify(this.skinAsset.vertices.Array));
        this.triangleIndices = this.skinAsset.triangles.Array;

        // just copy
        this.baseVertexBuffer = JSON.parse(JSON.stringify(this.vertexBuffer));
        this.baseTriangleIndices = JSON.parse(JSON.stringify(this.triangleIndices));

        const vShader = AnimationRenderer.compileShader(this.gl, vertexShader, this.gl.VERTEX_SHADER);
        const fShader = AnimationRenderer.compileShader(this.gl, fragmentShader, this.gl.FRAGMENT_SHADER);

        // check for errors
        if (!vShader || !fShader) {
            console.error("Failed to compile shaders.");
            return;
        }

        const vShaderBox = AnimationRenderer.compileShader(this.gl, vertexBoxShader, this.gl.VERTEX_SHADER);
        const fShaderBox = AnimationRenderer.compileShader(this.gl, fragmentBoxShader, this.gl.FRAGMENT_SHADER);

        // check for errors
        if (!vShaderBox || !fShaderBox) {
            console.error("Failed to compile shaders.");
            return;
        }

        this.shaderProgram = AnimationRenderer.createProgram(this.gl, vShader, fShader);
        this.shaderProgramBox = AnimationRenderer.createProgram(this.gl, vShaderBox, fShaderBox);

        if (!this.shaderProgram) {
            console.error("Failed to create shader program.");
            return;
        }

        // Prepare to load the texture
        const texture = this.gl.createTexture();
        this.webglTexture = texture;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = AnimationRenderer.ASSETS_URL + this.skinId + '/' + this.skinId + '-0.png';

        let gl = this.gl;
        image.onload = function() {
            // Bind the texture object
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Flip the image's Y axis to match WebGL's texture coordinate system
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

            // Set texture parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.disable(gl.POLYGON_OFFSET_FILL);
            gl.disable(gl.CULL_FACE);

            // Upload the image into the texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                gl.RGBA, gl.UNSIGNED_BYTE, image);
        };

        // Evaluate bounds animation
        this.boundsAnimation =  this.computeFrame(0);
        for (let i = 1; i < this.anim.frameCount; i++) {
            const bounds = this.computeFrame(i);
            this.boundsAnimation.encapsulate(bounds);
        }
        
    }

    public Start() {
        if (this.anim == null) {
            console.error("Animation instance not loaded.");
            return;
        }

        //this.showFighterIndicator();
        //return;

        this.preRender();

        let currentFrame = 0;

        this.intervalId = setInterval(() => {
            if(this.anim == null) {
                return;
            }

            currentFrame++;
            if (currentFrame >= this.anim.frameCount) {
                currentFrame = 0;
            }

            const bounds = this.computeFrame(currentFrame);
            this.render(bounds);
        }, 1000 / this.frameRate) as any;

    }
    
    public Stop(){
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
        }
    }

    public setScale(scale: number) {
        this.scale = scale;
    }

    public setIsHover(hovered: boolean, event: MouseEvent) {
        if (this.canvas) {
            if (hovered) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = event.clientX - rect.left;
                this.mouseY = rect.height - (event.clientY - rect.top); // Flip Y-axis to match WebGL coordinates
            } else {
                // this.selectedMesh = null;
            }
        }
        
    }

    preRender(){
        if(this.gl == null || this.shaderProgram == null || this.webglTexture == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        this.gl.useProgram(this.shaderProgram);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.aPosition = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
        this.aTexCoord = this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord');
        this.aMultiplicativeColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorMul');
        this.aAdditiveColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorAdd');

        this.uMatrix = this.gl.getUniformLocation(this.shaderProgram, 'uMatrix');
        const uTexture = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');

        // Set the texture uniform
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.webglTexture);
        this.gl.uniform1i(uTexture, 0);

    }

    private setProjectionMatrix(uMatrix: WebGLUniformLocation | null) {
        if(!this.gl || !this.shaderProgram || !this.canvas)
            return;

        // Set up your orthographic projection matrix
        const projectionMatrix = Mat4.create();
        Mat4.ortho(
            projectionMatrix,
            -this.canvas.width / 2, this.canvas.width / 2,
            -this.canvas.height / 2, this.canvas.height / 2,
            -1, 1
        );

        const uMatrixArray = new Float32Array(16);

        // Create a scaling matrix
        const scaleMatrix = Mat4.create();
        Mat4.identity(scaleMatrix);
        Mat4.scale(scaleMatrix, scaleMatrix, new Float32Array([this.scale, this.scale, 1.0, 1.0]));

        // Multiply the projection matrix by the scaling matrix
        const scaledProjectionMatrix = Mat4.create();
        Mat4.multiply(scaledProjectionMatrix, projectionMatrix, scaleMatrix);

        // Copy the projection matrix into uMatrix[0] and uMatrix[1]
        // Since WebGL uses column-major order, adjust accordingly
        uMatrixArray.set(scaledProjectionMatrix.subarray(0, 4), 0);   // uMatrix[0 - 4]
        uMatrixArray.set(scaledProjectionMatrix.subarray(4, 8), 4);   // uMatrix[4 - 8]

        // Set the color multiplication vector cm in uMatrix[2]
        uMatrixArray[8] = 1.0;  // cm.x (Red multiplier)
        uMatrixArray[9] = 1.0;  // cm.y (Green multiplier)
        uMatrixArray[10] = 1.0; // cm.z (Blue multiplier)
        uMatrixArray[11] = 1.0; // cm.w (Alpha multiplier)

        // Set the color addition vector ca in uMatrix[3]
        uMatrixArray[12] = 0.0; // ca.x (Red addition)
        uMatrixArray[13] = 0.0; // ca.y (Green addition)
        uMatrixArray[14] = 0.0; // ca.z (Blue addition)
        uMatrixArray[15] = 0.0; // ca.w (Alpha addition)

        this.gl.uniformMatrix4fv(uMatrix, false, uMatrixArray);
    }

    render(bounds: Bounds) {
        if(this.gl == null || this.shaderProgram == null || this.webglTexture == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        this.setProjectionMatrix(this.uMatrix);

        const highlighted = this.isMouseOverAnimation(bounds, this.scale);


        this.renderMeshes(highlighted);
    }

    showFighterIndicator(){
        if(this.gl == null || this.shaderProgramBox == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        this.gl.useProgram(this.shaderProgramBox);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        let aPosition = this.gl.getAttribLocation(this.shaderProgramBox, 'aPosition');
        let aMultiplicativeColor = this.gl.getAttribLocation(this.shaderProgramBox, 'aColorMul');
        let aAdditiveColor = this.gl.getAttribLocation(this.shaderProgramBox, 'aColorAdd');
        let uMatrix = this.gl.getUniformLocation(this.shaderProgramBox, 'uMatrix');

        if(aPosition === -1 || aMultiplicativeColor === -1 || aAdditiveColor === -1 || uMatrix === null) {
            console.error("Failed to get attribute or uniform locations.");
            return;
        }

        let vertices = [
            { x: -40, y: 60, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 0 // outside
            { x:  40, y: 60, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 1 // outside
            { x: -30, y: 50, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 2
            { x:  30, y: 50, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 3
            { x: -40, y: 40, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 4 // outside
            { x: -30, y: 45, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 5
            { x:  30, y: 45, r: 1.0, g: 1.0, b: 0.0, a: 0.3 }, // 6
            { x:  40, y: 40, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }, // 7 // outside
            { x:   0, y: 10, r: 1.0, g: 1.0, b: 0.0, a: 0.5 }, // 8
            { x:   0, y:  0, r: 1.0, g: 0.0, b: 0.0, a: 1.0 }  // 9 // outside
        ];

        // triangles are defined CCW
        let triangles = [
            [1, 0, 2], // A
            [2, 0, 4], // B
            [4, 5, 2], // C
            [8, 5, 4], // D
            [4, 9, 8], // E
            [8, 9, 7], // F
            [7, 6, 8], // G
            [3, 6, 7], // H
            [7, 1, 3], // I
            [2, 3, 1], // J
            [3, 2, 5], // K
            [5, 6, 3], // L
            [5, 8, 6]  // M
        ];

        const indices = new Uint16Array(triangles.length * 3);

        let globalIndices = 0;

        for (let i = 0; i < triangles.length; i++) {
            indices[i * 3] = triangles[i][0] + globalIndices++;
            indices[i * 3 + 1] = triangles[i][1] + globalIndices++;
            indices[i * 3 + 2] = triangles[i][2] + globalIndices++;
        }

        const verticesBuffer = new Float32Array(vertices.length * 5);
        const colorsBuffer = new Float32Array(vertices.length * 4);

        this.loadIndicator(vertices, triangles, verticesBuffer, colorsBuffer);

        const positionBuffer = this.gl.createBuffer();
        const indexBuffer = this.gl.createBuffer();
        const multiplicativeColorBuffer = this.gl.createBuffer();
        const additiveColorBuffer = this.gl.createBuffer();


        this.setProjectionMatrix(uMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticesBuffer, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(aPosition);
        this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 5 * 4, 0);

        const colorOffset = 2 * 4;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, multiplicativeColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colorsBuffer, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(aMultiplicativeColor);
        this.gl.vertexAttribPointer(aMultiplicativeColor, 4, this.gl.FLOAT, false, 5 * 4, colorOffset);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, additiveColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colorsBuffer, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(aAdditiveColor);
        this.gl.vertexAttribPointer(aAdditiveColor, 3, this.gl.FLOAT, false, 0, 0);

        // Draw the asset
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);

        console.log("showFighterIndicator");
        console.log(verticesBuffer);
        console.log(indices);


    }

    loadIndicator(vertices: {
        x: number,
        y: number,
        r: number,
        g: number,
        b: number,
        a: number
    }[],
                  triangles: number[][],
                  vertexBuffer: Float32Array,
                  colorBuffer: Float32Array) {
        const VERTICES_PER_TRIANGLE = 3;
        const VERTEX_BUFFER_STRIDE = 5;

        let minX = Infinity;
        let maxX = -Infinity;

        let minY = Infinity;
        let maxY = -Infinity;

        for (let t = 0; t < triangles.length; t++) {
            for (let v = 0; v < VERTICES_PER_TRIANGLE; v++) {
                let bufferIndex = (t * VERTICES_PER_TRIANGLE + v) * VERTEX_BUFFER_STRIDE;

                let vertex = vertices[triangles[t][v]];
                let x = vertex.x;
                let y = vertex.y;

                let r = Math.max(-128, Math.min(127, vertex.r * 64));
                let g = Math.max(-128, Math.min(127, (1.0) * 64));
                let b = Math.max(-128, Math.min(127, vertex.b * 64));
                let a = Math.max(-128, Math.min(127, (1.0 && vertex.a) * 64));
                let color = ((a << 24) & 0xff000000) + ((b << 16) & 0xff0000) + ((g << 8) & 0xff00) + (r & 0xff);

                vertexBuffer[bufferIndex]     = x;
                vertexBuffer[bufferIndex + 1] = y;

                colorBuffer[bufferIndex  + 3]  = color;

                if (minX > x) { minX = x; } else if (maxX < x) { maxX = x; }
                if (minY > y) { minY = y; } else if (maxY < y) { maxY = y; }
            }
        }
    };


    private clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    private renderMeshes(highlighted: boolean) {
        if(this.gl == null || this.shaderProgram == null || this.webglTexture == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        this.gl.useProgram(this.shaderProgram);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        const positions: number[] = [];
        const texCoords: number[] = [];
        const multiplicativeColors: number[] = [];
        const additiveColors: number[] = [];
        const indices: number[] = this.triangleIndices;
        const boundsOffsetY = this.boundsAnimation ? (this.boundsAnimation?.maxY - this.boundsAnimation?.minY) / 2 : 0;

        for (let meshKey in this.meshes) {
            const mesh = this.meshes[meshKey];

            mesh.vertex.forEach(vertex => {
                positions.push(vertex.pos.x, vertex.pos.y - boundsOffsetY);
                texCoords.push(vertex.uv.x, this.clamp((1-vertex.uv.y), 0, 1));

                const multiplicativeColor = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);
                const additiveColor = ColorUtils.ConvertFromEncodedColor(vertex.additiveColor);

                // Push RGBA components normalized to [0,1]

                let tint = [
                    1.0,
                    1.0,
                    1.0,
                    1.0
                ]

                if(highlighted) {
                    tint = [
                        1.7,
                        1.7,
                        1.7,
                        1.0
                    ]
                }

                multiplicativeColors.push(
                    (multiplicativeColor.r / 2) * tint[0],
                    (multiplicativeColor.g / 2) * tint[1],
                    (multiplicativeColor.b / 2) * tint[2],
                    (multiplicativeColor.a / 2) * tint[3]
                );

                additiveColors.push(
                    additiveColor.r,
                    additiveColor.g,
                    additiveColor.b,
                    additiveColor.a
                );
            });
        }

        this.draw(positions, texCoords, indices, multiplicativeColors, additiveColors);
    }

    private draw(positions: number[], texCoords: number[], indices: number[], multiplicativeColors: number[], additiveColors: number[]) {
        if(this.gl == null || this.shaderProgram == null || this.webglTexture == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        const positionBuffer = this.gl.createBuffer();
        const indexBuffer = this.gl.createBuffer();
        const texCoordBuffer = this.gl.createBuffer();
        const multiplicativeColorBuffer = this.gl.createBuffer();
        const additiveColorBuffer = this.gl.createBuffer();


        // Bind and upload multiplicative color data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, multiplicativeColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(multiplicativeColors), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.aMultiplicativeColor);
        this.gl.vertexAttribPointer(this.aMultiplicativeColor, 4, this.gl.FLOAT, false, 0, 0);

        // Bind and upload additive color data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, additiveColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(additiveColors), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.aAdditiveColor);
        this.gl.vertexAttribPointer(this.aAdditiveColor, 4, this.gl.FLOAT, false, 0, 0);

        // Bind position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.aPosition);
        this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);

        // Bind texture coordinate buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.aTexCoord);
        this.gl.vertexAttribPointer(this.aTexCoord, 2, this.gl.FLOAT, false, 0, 0);

        // Bind index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        //this.gl.uniform2f(uScaleLocation, this.scale, this.scale);
        //this.gl.uniform2fv(uTranslation, [this.offsetX, this.offsetY]);

        // Draw the asset
        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);

        // Clean up buffers
        this.gl.deleteBuffer(positionBuffer);
        this.gl.deleteBuffer(texCoordBuffer);
        this.gl.deleteBuffer(indexBuffer);
        this.gl.deleteBuffer(multiplicativeColorBuffer);
        this.gl.deleteBuffer(additiveColorBuffer);
    }

    computeFrame(frame: number): Bounds {
        const frameBounds = new Bounds(new Vector2(0,0), new Vector2(0,0));

        if(this.anim == null) {
            return frameBounds;
        }

        let nodeCount = this.anim.nodeCount;
        let bytes = this.anim.data;
        let frameDataPositions = this.anim.frameDataPositions;
        let dataPosition = frameDataPositions[frame];

        this.vertexBuffer = [];
        this.triangleIndices = [];

        this.meshes.length = 0;

        for(let i = 0; i < this.renderStates.length; i++){
            this.renderStates[i].Reset();
        }

        this.skipToJustBeforeFrame(frame);
        let nodesCount = nodeCount - 1;

        while (nodesCount >= 0 && dataPosition < bytes.byteLength) {
            let dataView = new DataView(bytes, dataPosition);
            let nodeNum = dataView.getUint16(0, true);

            dataPosition += 2;

            dataPosition = this.renderStates[nodeNum].compute(new Uint8Array(bytes), dataPosition);
            const renderState = this.renderStates[nodeNum];

            let part = Object.values(this.entries)[this.renderStates[nodeNum].spriteIndex];

            if(part === undefined) {
                nodesCount--;
                continue;
            }

            for(let p in part.skinChunks.Array){
                let skinChunk = part.skinChunks.Array[p];
                const newVertices: Vertex[] = [];
                let count = this.vertexBuffer.length;

                let partBounds = this.transformVerticesIntoList(newVertices,
                    this.baseVertexBuffer,
                    skinChunk.startVertexIndex,
                    skinChunk.vertexCount,
                    renderState);

                this.vertexBuffer = this.vertexBuffer.concat(newVertices);

                frameBounds.encapsulate(partBounds);

                const newTriangleIndices: number[] = [];
                this.offsetIndicesIntoList(newTriangleIndices,
                    this.baseTriangleIndices,
                    skinChunk.startIndexIndex,
                    skinChunk.indexCount,
                    /*count*/ 0);

                this.offsetIndicesIntoList(this.triangleIndices,
                    this.baseTriangleIndices,
                    skinChunk.startIndexIndex,
                    skinChunk.indexCount,
                    count);

                let mesh = {
                    nodeNum: nodeNum,
                    part: part,
                    renderState: renderState,
                    vertex: newVertices,
                    indices: newTriangleIndices,
                };

                this.meshes.push(mesh);

            }

            nodesCount--;

        }
        return frameBounds;
    }

    skipToJustBeforeFrame(frame: number){
        if(this.anim == null) {
            return;
        }

        let frameDataPositions = this.anim.frameDataPositions;
        for(let i = 0; i < frame; i++){
            let dataPosition = frameDataPositions[i];
            for(let j = this.anim.nodeCount; j >= 0; j--){
                if(dataPosition >= this.anim.data.byteLength){
                    break;
                }
                let dataView = new DataView(this.anim.data, dataPosition);
                let nodeNum = dataView.getUint16(0, true);
                dataPosition += 2;
                dataPosition = this.renderStates[nodeNum].compute(new Uint8Array(this.anim.data), dataPosition);
            }
        }
    }

    transformVerticesIntoList(destination: Vertex[], source: Vertex[], startVertexIndex: number, vertexCount: number, renderState: RenderState): Bounds {
        const num = startVertexIndex + vertexCount;
        let vector = Vector2.positiveInfinity();
        let vector2 = Vector2.negativeInfinity();

        for (let i = startVertexIndex; i < num; i++) {
            const animationGeometryVertex = this.transformVertex(renderState, source[i]);
            destination.push(animationGeometryVertex);
            vector = Vector2.Min(vector, animationGeometryVertex.pos);
            vector2 = Vector2.Max(vector2, animationGeometryVertex.pos);
        }

        const vector3 = vector.add(vector2).multiply(0.5);
        return new Bounds(vector3, vector2.subtract(vector3));
    }

    transformVertex(renderState: RenderState, vertex: Vertex): Vertex {
        // Get the current position of the vertex
        const pos = vertex.pos;

        // Transform the position using the render state's transformation matrix
        const newX = renderState.m00 * pos.x + renderState.m01 * pos.y + renderState.m03;
        const newY = renderState.m10 * pos.x + renderState.m11 * pos.y + renderState.m13;

        let newVertex = {
            pos: new Vector2(newX, newY),
            uv: vertex.uv,
            multiplicativeColor: vertex.multiplicativeColor,
            additiveColor: vertex.additiveColor
        }

        // Convert the encoded multiplicative color to RGBA components
        const color = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);

        // Adjust the alpha component based on the render state's alpha value
        const adjustedAlpha = color.a * (renderState.alpha / 255);

        // Update the vertex's multiplicative color
        newVertex.multiplicativeColor = ColorUtils.ConvertSWFColor(color.r, color.g, color.b, adjustedAlpha);

        // Return the modified vertex
        return newVertex;
    }

    offsetIndicesIntoList(destination: number[], source: number[], startIndex: number, indexCount: number, offset: number) {
        let num = startIndex + indexCount;
        for (let i = startIndex; i < num; i++)
        {
            destination.push(source[i] + offset);
        }
    }

    static compileShader(gl: WebGLRenderingContext, shaderSource: string, shaderType: number): WebGLShader | null {
        const shader = gl.createShader(shaderType);

        if (!shader) {
            console.error('Failed to create shader.');
            return null;
        }

        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);

        // Check for errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            console.error('Shader compilation error:', error);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    static createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
        const program = gl.createProgram();

        if (!program) {
            console.error('Failed to create program.');
            return null;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        // Check for errors
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            console.error('Program linking error:', error);
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    isMouseOverAnimation(boundingBox: Bounds, scale: number) {
        // Apply scaling and translation to the bounding box
        const transformedMinX = boundingBox.minX * scale + this.offsetX;
        const transformedMinY = boundingBox.minY * scale + this.offsetY;
        const transformedMaxX = boundingBox.maxX * scale + this.offsetX;
        const transformedMaxY = boundingBox.maxY * scale + this.offsetY;
        // Check if mouse coordinates are within the transformed bounding box
        return (
            this.mouseX >= transformedMinX &&
            this.mouseX <= transformedMaxX &&
            this.mouseY >= transformedMinY &&
            this.mouseY <= transformedMaxY
        );
    }

    /**
     * Renders a blurred outline around the entire animation.
     * @param {Object} boundingBox - The overall bounding box of the animation.
     * @param {WebGLProgram} shaderProgram - The shader program.
     */
    /**
     * Renders the shadow of the selected mesh.
     */
    renderShadow() {
        if(this.gl === null) {
            console.error("WebGL not supported.");
            return;
        }
        
        if(this.shaderProgram === null) {
            console.error("shaderProgram is null.");
            return;
        }

        const shadowColor = [0.2, 0.2, 0.2, 0.9]; // RGBA

        // Define number of blur passes
        // Create buffers for outline
        const positions: number[] = [];
        const texCoords: number[] = [];
        const multiplicativeColors: number[] = [];
        const additiveColors: number[] = [];
        const indices: number[] = this.triangleIndices;

        for (let meshKey in this.meshes) {
            const mesh = this.meshes[meshKey];

            mesh.vertex.forEach(vertex => {
                positions.push(vertex.pos.x, -vertex.pos.y);
                texCoords.push(vertex.uv.x, 1.0 - vertex.uv.y);

                const multiplicativeColor = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);
                const additiveColor = ColorUtils.ConvertFromEncodedColor(vertex.additiveColor);

                // Push RGBA components normalized to [0,1]
                multiplicativeColors.push(
                    shadowColor[0] * multiplicativeColor.r / 2,
                    shadowColor[1] * multiplicativeColor.g / 2,
                    shadowColor[2] * multiplicativeColor.b / 2,
                    shadowColor[3] * multiplicativeColor.a / 2
                );

                additiveColors.push(
                    additiveColor.r,
                    additiveColor.g,
                    additiveColor.b,
                    additiveColor.a
                );
            });
        }

        this.draw(positions, texCoords, indices, multiplicativeColors, additiveColors);
    }
}