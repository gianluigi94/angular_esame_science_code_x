// in questo file creo li shader per creare il bagliore degli anelli di saturno

export const vertexShader = /* glsl */ `
  varying vec3 vPosition;
  void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform vec3  uColor;
uniform float uOpacity;
varying vec3  vPosition;

void main() {
    float r = length(vPosition.xy);
    float m = 0.5 * (uInnerRadius + uOuterRadius);
    float a = smoothstep(uInnerRadius, m, r);
    float b = 1.0 - smoothstep(m, uOuterRadius, r);
    float alpha = a * b * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
}
`;
