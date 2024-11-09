import AnimationInstance from './AnimationInstance.js';
import RenderState from './rendering/RenderState.js';
import ColorUtils from './utils/ColorUtils.js';
import Bounds from './utils/Bounds.js';
import Vector2 from './utils/Vector2.js';

 
export default class AnimationRenderer {

    static vertexShaderSource = `
            // Vertex Shader Source
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            attribute vec4 aMultiplicativeColor;
            attribute vec4 aAdditiveColor;

            uniform mat4 uProjectionMatrix;
            uniform vec2 uTranslation;
            uniform vec2 uScale;
            uniform float uOutlineScale; // New uniform for outline scaling

            varying vec2 vTexCoord;
            varying vec4 vMultiplicativeColor;
            varying vec4 vAdditiveColor;

            void main(void) {
                // Apply scaling (object scale + outline scale)
                vec2 scaledPosition = aPosition * uScale * (uOutlineScale > 1.0 ? uOutlineScale : 1.0);

                // Apply translation
                vec2 translatedPosition = scaledPosition + uTranslation;

                // Apply projection
                gl_Position = uProjectionMatrix * vec4(translatedPosition, 0.0, 1.0);

                // Pass through texture coordinates and colors
                vTexCoord = aTexCoord;
                vMultiplicativeColor = aMultiplicativeColor;
                vAdditiveColor = aAdditiveColor;
            }
        `;

    static fragmentShaderSource = `
        // Fragment Shader Source
        precision mediump float;

        uniform sampler2D uTexture;
        uniform bool uIsOutline;

        varying vec2 vTexCoord;
        varying vec4 vMultiplicativeColor;
        varying vec4 vAdditiveColor;

        void main(void) {
            if (uIsOutline) {
                // Render the outline color with its alpha
                gl_FragColor = vMultiplicativeColor + vAdditiveColor;
            } else {
                // Standard rendering with texture
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = (texColor * vMultiplicativeColor) + vAdditiveColor;
            }
        }
    `;
        
        
    static vertexBuffer = [];
    static baseVertexBuffer = [];
    static baseTriangleIndices = [];
    static triangleIndices = [];
    static meshes = [];

    static mouseX = 0;
    static mouseY = 0;

    static intervalId;

    static async Start(skinId, animation) {
        AnimationRenderer.reset();
        const canvas = document.getElementById('glCanvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            alert('Unable to initialize WebGL. Your browser may not support it.');
        }

        // Initialize variables to store mouse position

        // Variable to store the currently selected mesh
        let selectedMesh = null;

        // Add event listener for mouse movement
        canvas.addEventListener('mousemove', function(event) {
            const rect = canvas.getBoundingClientRect();
            AnimationRenderer.mouseX = event.clientX - rect.left;
            AnimationRenderer.mouseY = rect.height - (event.clientY - rect.top); // Flip Y-axis to match WebGL coordinates
        }, false);

        // Add event listener for mouse leave to deselect mesh
        canvas.addEventListener('mouseleave', function() {
            selectedMesh = null;
        }, false);

        const skinAssetDataReq = await fetch("./resources/" + skinId +"/" + skinId + "-SkinAsset.json")
        const skinAsset = await skinAssetDataReq.json();

        let keys = skinAsset.m_keys;
        let values = skinAsset.m_values;

        skinAsset.entries = {};
        for(let i = 0; i < keys.Array.length; i++) {
            skinAsset.entries[keys.Array[i]] = values.Array[i];
        }

        const anim = await AnimationInstance.readInstance("./resources/" + skinId + "/" + skinId + "_" + animation + ".dat");

        let renderStates = Array(anim.NodeCount).fill().map(() => new RenderState());

        AnimationRenderer.vertexBuffer = JSON.parse(JSON.stringify(skinAsset.vertices.Array));
        AnimationRenderer.triangleIndices = skinAsset.triangles.Array;

        // just copy
        AnimationRenderer.baseVertexBuffer = JSON.parse(JSON.stringify(AnimationRenderer.vertexBuffer));
        AnimationRenderer.baseTriangleIndices = JSON.parse(JSON.stringify(AnimationRenderer.triangleIndices));


        // Compile shaders
        const vertexShader = AnimationRenderer.compileShader(gl, AnimationRenderer.vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = AnimationRenderer.compileShader(gl, AnimationRenderer.fragmentShaderSource, gl.FRAGMENT_SHADER);

        // Create shader program
        const shaderProgram = AnimationRenderer.createProgram(gl, vertexShader, fragmentShader);
        // Prepare to load the texture
        const texture = gl.createTexture();
        const image = new Image();
        image.src = './resources/' + skinId + '/' + skinId + '.png';

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

            startRendering();
        };


        let startRendering = function () {
            let currentFrame = 0;

            AnimationRenderer.intervalId = setInterval(() => {
                currentFrame++;
                if (currentFrame >= anim.FrameCount) {
                    currentFrame = 0;
                }

                const bounds = AnimationRenderer.computeFrame(anim, currentFrame, renderStates, skinAsset);
                AnimationRenderer.Render(gl, canvas, scale, shaderProgram, texture, bounds);
            }, 1000 / 30);
        }        

        let scale = 1.0; // Default scale (no zoom)
        const scaleStep = 0.1; // Scale increment/decrement step
        // Add event listener for mouse wheel to handle zoom
        canvas.addEventListener('wheel', function(event) {
            event.preventDefault(); // Prevent the page from scrolling

            // Determine the direction of the wheel scroll
            if (event.deltaY < 0) {
                // Zoom in
                scale += scaleStep;
                if (scale > 5.0) scale = 5.0; // Set an upper limit to zoom in
            } else {
                // Zoom out
                scale -= scaleStep;
                if (scale < 0.1) scale = 0.1; // Set a lower limit to zoom out
            }
        }, { passive: false });
    }

    static Render(gl, canvas, scale, shaderProgram, texture, animationBoundingBox) {
        // Use the shader program
        gl.useProgram(shaderProgram);

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


        // Get attribute locations
        const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
        const aTexCoord = gl.getAttribLocation(shaderProgram, 'aTexCoord');
        const aMultiplicativeColor = gl.getAttribLocation(shaderProgram, 'aMultiplicativeColor');
        const aAdditiveColor = gl.getAttribLocation(shaderProgram, 'aAdditiveColor');


        // Get uniform locations
        const uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
        const uTranslation = gl.getUniformLocation(shaderProgram, 'uTranslation');
        const uTexture = gl.getUniformLocation(shaderProgram, 'uTexture');
        const uScaleLocation = gl.getUniformLocation(shaderProgram, 'uScale');

        // Set the texture uniform
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uTexture, 0);

        // Set up the projection matrix
        const projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix, 0, canvas.width, 0, canvas.height, -1, 1);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniform2f(uScaleLocation, scale, scale);

        // Clear the canvas
        gl.clearColor(255.0, 255.0, 255.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Perform hit detection based on the overall bounding box
        if (AnimationRenderer.isMouseOverAnimation(animationBoundingBox, scale)) {
            console.log('Mouse is over the animation!');
            for(let meshKey in AnimationRenderer.meshes) {
                const mesh = AnimationRenderer.meshes[meshKey];
                AnimationRenderer.renderOutline(gl, mesh, shaderProgram, texture, scale);
            }
        }

        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uIsOutline'), false);
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'uOutlineScale'), 1.0);

        for(let meshKey in AnimationRenderer.meshes){
            const mesh = AnimationRenderer.meshes[meshKey];


            const positions = [];
            const texCoords = [];
            const multiplicativeColors = [];
            const additiveColors = [];

            // Vertices
            mesh.vertex.forEach(vertex => {
                positions.push(vertex.pos.x, vertex.pos.y);
                texCoords.push(vertex.uv.x, (1 - vertex.uv.y));

                const multiplicativeColor = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);
                const additiveColor = ColorUtils.ConvertFromEncodedColor(vertex.additiveColor);

                // Push RGBA components normalized to [0,1]
                multiplicativeColors.push(
                    multiplicativeColor.r,
                    multiplicativeColor.g,
                    multiplicativeColor.b,
                    multiplicativeColor.a
                );

                additiveColors.push(
                    additiveColor.r,
                    additiveColor.g,
                    additiveColor.b,
                    additiveColor.a
                );
            });

            const indices = mesh.indices;

            // Create and bind buffers

            const positionBuffer = gl.createBuffer();
            const indexBuffer = gl.createBuffer();
            const texCoordBuffer = gl.createBuffer();
            const multiplicativeColorBuffer = gl.createBuffer();
            const additiveColorBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

            // Bind and upload multiplicative color data
            gl.bindBuffer(gl.ARRAY_BUFFER, multiplicativeColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(multiplicativeColors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aMultiplicativeColor);
            gl.vertexAttribPointer(aMultiplicativeColor, 4, gl.FLOAT, false, 0, 0);

            // Bind and upload additive color data
            gl.bindBuffer(gl.ARRAY_BUFFER, additiveColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(additiveColors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aAdditiveColor);
            gl.vertexAttribPointer(aAdditiveColor, 4, gl.FLOAT, false, 0, 0);

            // Bind position buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

            // Bind texture coordinate buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.enableVertexAttribArray(aTexCoord);
            gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

            // Bind index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

            gl.uniform2fv(uTranslation, [400, 250]);

            // Draw the asset
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

            // Clean up buffers
            gl.deleteBuffer(positionBuffer);
            gl.deleteBuffer(texCoordBuffer);
            gl.deleteBuffer(indexBuffer);
            gl.deleteBuffer(multiplicativeColorBuffer);
            gl.deleteBuffer(additiveColorBuffer);
        }
    }
    
    static compileShader(gl, shaderSource, shaderType) {
        const shader = gl.createShader(shaderType);
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

    static createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
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

    static computeFrame(animation, frame, renderStates, skinAsset) {
        let nodeCount = animation.NodeCount;
        let bytes = animation.Data;
        let frameDataPositions = animation.FrameDataPositions;

        let dataPosition = frameDataPositions[frame];
        AnimationRenderer.vertexBuffer = [];
        AnimationRenderer.triangleIndices = [];

        AnimationRenderer.meshes.length = 0;

        for(let i = 0; i < renderStates.length; i++){
            renderStates[i].Reset();
        }

        // reset render states
        AnimationRenderer.SkipToJustBeforeFrame(animation, frame, renderStates);

        const frameBounds = new Bounds(new Vector2(0,0), new Vector2(0,0));

        let nodesCount = nodeCount - 1;
        while (nodesCount >= 0 && dataPosition < bytes.byteLength)
        {
            // we have to copy it because it's modified everytime
            // C'EST SUPER MAL OPTIMISÉ FRANCHEMENT MAIS ÇA DEMANDE UN PEU TROP DE CHANGEMENT DE MODIFIER ÇA
            AnimationRenderer.baseVertexBuffer = JSON.parse(JSON.stringify(skinAsset.vertices.Array));

            let dataView = new DataView(bytes, dataPosition);
            // we get a ushort to get the node num
            let nodeNum = dataView.getUint16(0, true);

            dataPosition += 2;

            dataPosition = renderStates[nodeNum].compute(new Uint8Array(bytes), dataPosition);
            let renderState = renderStates[nodeNum];

            // we have to find the skinasset.parts at index of render state of spriteIndex
            // safely, if it's not inside the array, we skip
            //console.log(renderStates[nodeNum].spriteIndex)
            let part = Object.values(skinAsset.entries)[renderStates[nodeNum].spriteIndex];

            if(part === undefined) {
                nodesCount--;
                continue;
            }


            //console.log('rendering', nodeNum, renderState.spriteIndex, part);
            //console.log('renderState', renderState);

            for(let p in part.skinChunks.Array){
                let skinChunk = part.skinChunks.Array[p];
                const newVertices = [];

                let partBounds = AnimationRenderer.transformVerticesIntoList(newVertices,
                    AnimationRenderer.baseVertexBuffer,
                    skinChunk.startVertexIndex,
                    skinChunk.vertexCount,
                    renderState);

                AnimationRenderer.vertexBuffer = AnimationRenderer.vertexBuffer.concat(newVertices);

                frameBounds.encapsulate(partBounds);

                const newTriangleIndices = [];
                AnimationRenderer.offsetIndicesIntoList(newTriangleIndices,
                    AnimationRenderer.baseTriangleIndices,
                    skinChunk.startIndexIndex,
                    skinChunk.indexCount,
                    /*count*/ 0);

                    AnimationRenderer.triangleIndices = AnimationRenderer.triangleIndices.concat(newTriangleIndices);

                let mesh = {
                    nodeNum: nodeNum,
                    part: part,
                    renderState: renderState,
                    vertex: newVertices,
                    indices: newTriangleIndices,
                };
                AnimationRenderer.meshes.push(mesh);

            }

            nodesCount--;
        }

        return frameBounds;
    }

    /**
     * Renders a blurred outline around the entire animation.
     * @param {Object} boundingBox - The overall bounding box of the animation.
     * @param {WebGLProgram} shaderProgram - The shader program.
     */
    /**
     * Renders a blurred outline around the selected mesh.
     * @param {Object} mesh - The selected mesh object.
     * @param {WebGLProgram} shaderProgram - The shader program.
     * @param {WebGLTexture} texture - The texture to use.
     */
    static renderOutline(gl, mesh, shaderProgram, texture, scale) {
        const aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
        const aTexCoord = gl.getAttribLocation(shaderProgram, 'aTexCoord');
        const aMultiplicativeColor = gl.getAttribLocation(shaderProgram, 'aMultiplicativeColor');
        const aAdditiveColor = gl.getAttribLocation(shaderProgram, 'aAdditiveColor');
        const uTranslation = gl.getUniformLocation(shaderProgram, 'uTranslation');
        const uScaleLocation = gl.getUniformLocation(shaderProgram, 'uScale');
        // Define outline color (e.g., semi-transparent black)
        const outlineColor = [0.0, 0.0, 0.0, 0.3]; // RGBA
        // Define number of blur passes
        const blurPasses = 4;
        const blurScaleStep = 0.10; // Scale increment per pass
        for (let i = 1; i <= blurPasses; i++) {
            // Create buffers for outline
            const outlinePositionBuffer = gl.createBuffer();
            const outlineIndexBuffer = gl.createBuffer();
            const outlineTexCoordBuffer = gl.createBuffer();
            const outlineMultiplicativeColorBuffer = gl.createBuffer();
            const outlineAdditiveColorBuffer = gl.createBuffer();
            // Prepare outline vertices (scaled up)
            const outlinePositions = [];
            const outlineTexCoords = [];
            const outlineMultiplicativeColors = [];
            const outlineAdditiveColors = [];
            mesh.vertex.forEach(vertex => {
                // Apply additional scaling for outline
                const scaledX = vertex.pos.x * (1 + blurScaleStep * i);
                const scaledY = vertex.pos.y * (1 + blurScaleStep * i);
                // we need to
                outlinePositions.push(scaledX, scaledY);
                outlineTexCoords.push(vertex.uv.x, (1 - vertex.uv.y));
                // Set multiplicative color to the outline color
                outlineMultiplicativeColors.push(
                    outlineColor[0],
                    outlineColor[1],
                    outlineColor[2],
                    outlineColor[3]
                );
                // No additive color for outline
                outlineAdditiveColors.push(
                    0.0,
                    0.0,
                    0.0,
                    0.0
                );
            });
            const outlineIndices = mesh.indices;
            // Bind and upload outline buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, outlinePositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlinePositions), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, outlineTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineTexCoords), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, outlineIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(outlineIndices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, outlineMultiplicativeColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineMultiplicativeColors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aMultiplicativeColor);
            gl.vertexAttribPointer(aMultiplicativeColor, 4, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, outlineAdditiveColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineAdditiveColors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aAdditiveColor);
            gl.vertexAttribPointer(aAdditiveColor, 4, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, outlinePositionBuffer);
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, outlineTexCoordBuffer);
            gl.enableVertexAttribArray(aTexCoord);
            gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, outlineIndexBuffer);
            // Set translation same as original mesh
            gl.uniform2fv(uTranslation, [400, 250]);
            // Set the scale uniform same as original mesh
            gl.uniform2f(uScaleLocation, scale, scale);
            // Set blending for the outline (additive blending for blur effect)
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            // Draw the outline
            gl.drawElements(gl.TRIANGLES, outlineIndices.length, gl.UNSIGNED_SHORT, 0);
            // Re-enable additive color for subsequent meshes
            gl.enableVertexAttribArray(aAdditiveColor);
            gl.vertexAttribPointer(aAdditiveColor, 4, gl.FLOAT, false, 0, 0);
            // Clean up outline buffers
            gl.deleteBuffer(outlinePositionBuffer);
            gl.deleteBuffer(outlineTexCoordBuffer);
            gl.deleteBuffer(outlineIndexBuffer);
            gl.deleteBuffer(outlineMultiplicativeColorBuffer);
            gl.deleteBuffer(outlineAdditiveColorBuffer);
        }
    }

    /**
     * Determines if the mouse is over the animation based on its bounding box.
     * @param {Object} boundingBox - The overall bounding box of the animation.
     * @returns {boolean} True if the mouse is over the animation, false otherwise.
     */
    static isMouseOverAnimation(boundingBox, scale) {
        // Apply scaling and translation to the bounding box
        const transformedMinX = boundingBox.minX * scale + 400; // 400 is uTranslation.x
        const transformedMinY = boundingBox.minY * scale + 250; // 250 is uTranslation.y
        const transformedMaxX = boundingBox.maxX * scale + 400;
        const transformedMaxY = boundingBox.maxY * scale + 250;
        // Check if mouse coordinates are within the transformed bounding box
        return (
            AnimationRenderer.mouseX >= transformedMinX &&
            AnimationRenderer.mouseX <= transformedMaxX &&
            AnimationRenderer.mouseY >= transformedMinY &&
            AnimationRenderer.mouseY <= transformedMaxY
        );
    }

    static offsetIndicesIntoList(destination, source, startIndex, indexCount, offset) {
        let num = startIndex + indexCount;
        for (let i = startIndex; i < num; i++)
        {
            destination.push(source[i] + offset);
        }
    }

    
    static transformVertex(renderState, vertex) {
        // Get the current position of the vertex
        const pos = vertex.pos;

        // Transform the position using the render state's transformation matrix
        const newX = renderState.m00 * pos.x + renderState.m01 * pos.y + renderState.m03;
        const newY = renderState.m10 * pos.x + renderState.m11 * pos.y + renderState.m13;

        // Update the vertex position
        vertex.pos.x = newX;
        vertex.pos.y = newY;

        // Convert the encoded multiplicative color to RGBA components
        const color = ColorUtils.ConvertFromEncodedColor(vertex.multiplicativeColor);

        // Adjust the alpha component based on the render state's alpha value
        const adjustedAlpha = color.a * (renderState.alpha / 255);

        // Update the vertex's multiplicative color
        vertex.multiplicativeColor = ColorUtils.ConvertSWFColor(color.r, color.g, color.b, adjustedAlpha);

        // Return the modified vertex
        return vertex;
    }

    static transformVerticesIntoList(destination, source, startVertexIndex, vertexCount, renderState) {
        const num = startVertexIndex + vertexCount;
        let vector = Vector2.positiveInfinity();
        let vector2 = Vector2.negativeInfinity();

        for (let i = startVertexIndex; i < num; i++) {
            const animationGeometryVertex = AnimationRenderer.transformVertex(renderState, source[i]);
            destination.push(animationGeometryVertex);
            vector = Vector2.Min(vector, animationGeometryVertex.pos);
            vector2 = Vector2.Max(vector2, animationGeometryVertex.pos);
        }

        const vector3 = vector.add(vector2).multiply(0.5);
        return new Bounds(vector3, vector2.subtract(vector3));
    }

    static SkipToJustBeforeFrame(animation, frame, renderStates){
        let frameDataPositions = animation.FrameDataPositions;
        for(let i = 0; i < frame; i++){
            let dataPosition = frameDataPositions[i];
            for(let j = animation.NodeCount; j >= 0; j--){
                if(dataPosition >= animation.Data.byteLength){
                    break;
                }
                let dataView = new DataView(animation.Data, dataPosition);
                let nodeNum = dataView.getUint16(0, true);
                dataPosition += 2;
                dataPosition = renderStates[nodeNum].compute(new Uint8Array(animation.Data), dataPosition);
            }
        }
    }

    /**
    * Generates the outline vertices based on the bounding box.
    * @param {Object} boundingBox - The bounding box with min and max properties.
    * @returns {Float32Array} The array of outline vertices.
    */
    static generateOutlineVertices(boundingBox) {
        return new Float32Array([
            boundingBox.minX, boundingBox.minY,
            boundingBox.maxX, boundingBox.minY,
            boundingBox.maxX, boundingBox.maxY,
            boundingBox.minX, boundingBox.maxY
        ]);
    }

    static reset(){
        AnimationRenderer.vertexBuffer = [];
        AnimationRenderer.baseVertexBuffer = [];
        AnimationRenderer.baseTriangleIndices = [];
        AnimationRenderer.triangleIndices = [];
        AnimationRenderer.meshes = [];
        clearInterval(AnimationRenderer.intervalId);
    }
}
