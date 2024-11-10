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

