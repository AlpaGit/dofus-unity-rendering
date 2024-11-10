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
