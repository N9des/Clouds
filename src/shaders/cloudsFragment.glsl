uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
	vec4 color = vec4(1.0, 1.0, 1.0, 1.0);
	vec4 color1 = vec4(176.0/255.0, 185.0/255.0, 197.0/255.0, 1.0);
	vec4 color2 = vec4(238.0/255.0, 255.0/255.0, 231.0/255.0, 1.0);
	vec4 color3 = vec4(134.0/255.0, 132.0/255.0, 228.0/255.0, 0.01);
	vec4 baseTexture = texture2D(uTexture, vUv);

	vec4 baseColor = mix(color3, color2, baseTexture.a);

	gl_FragColor = vec4(baseColor);
	// gl_FragColor = vec4(baseTexture);

	gl_FragColor.a *= pow( gl_FragCoord.z, 0.1 );
}