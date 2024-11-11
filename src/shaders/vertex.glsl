// Vertex Shader Source
attribute vec2 aPosition;
attribute vec2 aTexCoord;
attribute vec4 aColorMul;
attribute vec4 aColorAdd;

uniform mat4 uMatrix;

varying vec2 vTexCoord;
varying vec4 vColorMul;
varying vec4 vColorAdd;

void main(void) {
    // Access columns of uMatrix for transformations
    vec4 tx = uMatrix[0]; // Column 0
    vec4 ty = uMatrix[1]; // Column 1
    vec4 cm = uMatrix[2]; // Column 2
    vec4 ca = uMatrix[3]; // Column 3

    vTexCoord = aTexCoord;
    vColorMul = aColorMul * cm * 2.0;
    vColorAdd = aColorAdd * cm + ca;
    vColorMul.rgb *= vColorMul.a;

    // Apply transformation
    gl_Position = vec4(
        aPosition.x * tx.x + aPosition.y * ty.x + tx.z,
        aPosition.x * tx.y + aPosition.y * ty.y + ty.z,
        0.0, 1.0
    );
}
