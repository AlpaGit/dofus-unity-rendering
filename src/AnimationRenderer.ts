import AnimationInstance from './AnimationInstance';
import RenderState from './rendering/RenderState';
import ColorUtils from './utils/ColorUtils';
import Bounds from './utils/Bounds';
import Vector2 from './utils/Vector2';

import fragmentShader from './shaders/fragment.glsl?raw';
import vertexShader from './shaders/vertex.glsl?raw';
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
    webglTexture: WebGLTexture | null = null;

    scale: number = 1.0;

    frameRate: number = 25;

    offsetX: number = 0;
    offsetY: number = 0;

    constructor(canvas: HTMLCanvasElement, skinId: number, animation: string) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl");

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
        console.log(vShader, fShader);

        // check for errors
        if (!vShader || !fShader) {
            console.error("Failed to compile shaders.");
            return;
        }

        this.shaderProgram = AnimationRenderer.createProgram(this.gl, vShader, fShader);

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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            // Upload the image into the texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                gl.RGBA, gl.UNSIGNED_BYTE, image);
        };

    }

    public Start() {
        if (this.anim == null) {
            console.error("Animation instance not loaded.");
            return;
        }

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

    render(bounds: Bounds) {
        if(this.gl == null || this.shaderProgram == null || this.webglTexture == null || this.canvas == null) {
            console.error("WebGL not supported or shader program not loaded.");
            return;
        }

        this.gl.useProgram(this.shaderProgram);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Get attribute locations
        const aPosition = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
        const aTexCoord = this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord');
        const aMultiplicativeColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorMul');
        const aAdditiveColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorAdd');

        // Get uniform locations
        // Create the uMatrix as a Float32Array of length 16 (mat4)
        const uMatrixArray = new Float32Array(16);

        // Set up your orthographic projection matrix
        const projectionMatrix = Mat4.create();
        Mat4.ortho(
            projectionMatrix,
            -this.canvas.width / 2, this.canvas.width / 2,
            -this.canvas.height / 2, this.canvas.height / 2,
            -1, 1
        );

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


        const uMatrix = this.gl.getUniformLocation(this.shaderProgram, 'uMatrix');
        const uTexture = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');

        this.gl.uniformMatrix4fv(uMatrix, false, uMatrixArray);

        // Set the texture uniform
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.webglTexture);
        this.gl.uniform1i(uTexture, 0);

        let minFilter = this.gl.LINEAR;
        let magFilter = this.gl.LINEAR;

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // Set up the projection matrix

        console.log(projectionMatrix)
        //this.gl.uniform2f(uScaleLocation, this.scale, this.scale);

        // Clear the canvas
        // this.gl.clearColor(255.0, 255.0, 255.0, 1.0);
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        if (this.isMouseOverAnimation(bounds, this.scale)) {
            this.renderShadow();
        }

        for(let meshKey in this.meshes) {
            const mesh = this.meshes[meshKey];

            const positions: number[] = [];
            const texCoords: number[] = [];
            const multiplicativeColors: number[] = [];
            const additiveColors: number[] = [];

            mesh.vertex.forEach(vertex => {
                positions.push(vertex.pos.x, vertex.pos.y);
                texCoords.push(vertex.uv.x, (1 - vertex.uv.y));

                const multiplicativeColor = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);
                const additiveColor = ColorUtils.ConvertFromEncodedColor(vertex.additiveColor);

                // Push RGBA components normalized to [0,1]
                multiplicativeColors.push(
                    multiplicativeColor.r / 2,
                    multiplicativeColor.g / 2,
                    multiplicativeColor.b / 2,
                    multiplicativeColor.a / 2
                );

                additiveColors.push(
                    additiveColor.r,
                    additiveColor.g,
                    additiveColor.b,
                    additiveColor.a
                );
            });

            const indices = mesh.indices;

            const positionBuffer = this.gl.createBuffer();
            const indexBuffer = this.gl.createBuffer();
            const texCoordBuffer = this.gl.createBuffer();
            const multiplicativeColorBuffer = this.gl.createBuffer();
            const additiveColorBuffer = this.gl.createBuffer();


            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

            // Bind and upload multiplicative color data
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, multiplicativeColorBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(multiplicativeColors), this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(aMultiplicativeColor);
            this.gl.vertexAttribPointer(aMultiplicativeColor, 4, this.gl.FLOAT, false, 0, 0);

            // Bind and upload additive color data
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, additiveColorBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(additiveColors), this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(aAdditiveColor);
            this.gl.vertexAttribPointer(aAdditiveColor, 4, this.gl.FLOAT, false, 0, 0);

            // Bind position buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.enableVertexAttribArray(aPosition);
            this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

            // Bind texture coordinate buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
            this.gl.enableVertexAttribArray(aTexCoord);
            this.gl.vertexAttribPointer(aTexCoord, 2, this.gl.FLOAT, false, 0, 0);

            // Bind index buffer
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

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

        const aPosition = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
        const aTexCoord = this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord');
        const aMultiplicativeColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorMul');
        const aAdditiveColor = this.gl.getAttribLocation(this.shaderProgram, 'aColorAdd');
        //const uTranslation = this.gl.getUniformLocation(this.shaderProgram, 'uTranslation');
        //const uScaleLocation = this.gl.getUniformLocation(this.shaderProgram, 'uScale');

        const shadowColor = [0.0, 0.0, 0.0, 0.3]; // RGBA

        // Define number of blur passes
        // Create buffers for outline
        const positionBuffer = this.gl.createBuffer();
        const indexBuffer = this.gl.createBuffer();
        const textCoordBuffer = this.gl.createBuffer();
        const multiplicativeColorBuffer = this.gl.createBuffer();
        const additiveColorBuffer = this.gl.createBuffer();

        const positions: Array<number> = [];
        const textCoords: Array<number> = [];
        const multiplicativeColors: Array<number> = [];
        const additiveColors: Array<number> = [];
        let indices: Array<number> = [];


        this.vertexBuffer.forEach(vertex => {
            // Apply additional scaling for outline
            const scaledX = vertex.pos.x;
            const scaledY = vertex.pos.y;
            // we need to
            positions.push(scaledX, scaledY);
            textCoords.push(vertex.uv.x, (1 - vertex.uv.y));
            // Set multiplicative color to the outline color
            multiplicativeColors.push(
                shadowColor[0],
                shadowColor[1],
                shadowColor[2],
                shadowColor[3]
            );
            // No additive color for outline
            additiveColors.push(
                0.0,
                0.0,
                0.0,
                0.0
            );
        });

        indices = this.triangleIndices;

        // Bind and upload outline buffers
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textCoords), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, multiplicativeColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(multiplicativeColors), this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(aMultiplicativeColor);
        this.gl.vertexAttribPointer(aMultiplicativeColor, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, additiveColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(additiveColors), this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(aAdditiveColor);
        this.gl.vertexAttribPointer(aAdditiveColor, 4, this.gl.FLOAT, false, 0, 0);


        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.enableVertexAttribArray(aPosition);
        this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textCoordBuffer);
        this.gl.enableVertexAttribArray(aTexCoord);
        this.gl.vertexAttribPointer(aTexCoord, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // Set translation same as original mesh
        //this.gl.uniform2fv(uTranslation, [this.offsetX, this.offsetY]);
        // Set the scale uniform same as original mesh
        //this.gl.uniform2f(uScaleLocation, this.scale, -this.scale);

        // Draw
        this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0);

        // Clean up buffers
        this.gl.deleteBuffer(positionBuffer);
        this.gl.deleteBuffer(textCoordBuffer);
        this.gl.deleteBuffer(indexBuffer);
        this.gl.deleteBuffer(multiplicativeColorBuffer);
        this.gl.deleteBuffer(additiveColorBuffer);
    }
}