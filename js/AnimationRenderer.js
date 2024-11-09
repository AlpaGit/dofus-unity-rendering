import AnimationInstance from './AnimationInstance.js';
import RenderState from './rendering/RenderState.js';
import ColorUtils from './utils/ColorUtils.js';
import Bounds from './utils/Bounds.js';
import Vector2 from './utils/Vector2.js';

 
export default class AnimationRenderer {

    static vertexShaderSource = `
            // Vertex Shader Source (vertexShaderSource)
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            attribute vec4 aMultiplicativeColor;
            attribute vec4 aAdditiveColor;

            uniform mat4 uProjectionMatrix;
            uniform vec2 uTranslation;
            uniform vec2 uScale; // New uniform for scaling

            varying vec2 vTexCoord;
            varying vec4 vMultiplicativeColor;
            varying vec4 vAdditiveColor;

            void main(void) {
                // Apply scaling to position
                vec2 scaledPosition = aPosition * uScale;

                // Apply translation to position the asset
                vec2 position = scaledPosition + uTranslation;

                // Transform the position using the projection matrix
                gl_Position = uProjectionMatrix * vec4(position, 0.0, 1.0);

                // Pass the texture coordinate and colors to the fragment shader
                vTexCoord = aTexCoord;
                vMultiplicativeColor = aMultiplicativeColor;
                vAdditiveColor = aAdditiveColor;
            }

        `;

    static fragmentShaderSource = `
            // Fragment Shader Source (fragmentShaderSource)
            precision mediump float;

            uniform sampler2D uTexture;

            varying vec2 vTexCoord;
            varying vec4 vMultiplicativeColor;
            varying vec4 vAdditiveColor;

            void main(void) {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = (texColor * vMultiplicativeColor) + vAdditiveColor;
            }
        `;
        
        
    static vertexBuffer = [];
    static baseVertexBuffer = [];
    static baseTriangleIndices = [];
    static triangleIndices = [];
    static gl;
    static meshes = [];

    static async Start() {
        const canvas = document.getElementById('glCanvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            alert('Unable to initialize WebGL. Your browser may not support it.');
        }

        const skinId = 431;

        const skinAssetDataReq = await fetch("./resources/" + skinId +"/" + skinId + "-SkinAsset.json")
        const skinAsset = await skinAssetDataReq.json();

        let keys = skinAsset.m_keys;
        let values = skinAsset.m_values;

        skinAsset.entries = {};
        for(let i = 0; i < keys.Array.length; i++) {
            skinAsset.entries[keys.Array[i]] = values.Array[i];
        }

        const anim = await AnimationInstance.readInstance("./resources/" + skinId + "/" + skinId + "_AnimMarche_1.dat");
        console.log(anim);

        let renderStates = Array(anim.NodeCount).fill().map(() => new RenderState());

        AnimationRenderer.vertexBuffer = JSON.parse(JSON.stringify(skinAsset.vertices.Array));
        AnimationRenderer.triangleIndices = skinAsset.triangles.Array;

        // just copy
        AnimationRenderer.baseVertexBuffer = JSON.parse(JSON.stringify(AnimationRenderer.vertexBuffer));
        AnimationRenderer.baseTriangleIndices = JSON.parse(JSON.stringify(AnimationRenderer.triangleIndices));


        console.log(skinAsset)
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

            setInterval(() => {
                currentFrame++;
                if (currentFrame >= anim.FrameCount) {
                    currentFrame = 0;
                }

                AnimationRenderer.computeFrame(anim, currentFrame, renderStates, skinAsset);
                AnimationRenderer.Render(gl, canvas, scale, shaderProgram, texture);
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

    static Render(gl, canvas, scale, shaderProgram, texture) {
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
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

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

        const frameBounds = new Bounds(Vector2.positiveInfinity(), Vector2.negativeInfinity());

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
}
