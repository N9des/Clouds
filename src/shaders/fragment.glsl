uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
	vec4 color = texture2D(uTexture, vUv);
	gl_FragColor = vec4(color);
	gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 );
}