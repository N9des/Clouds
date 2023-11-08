uniform sampler2D uTexture;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;

void main() {
	// vec4 color = texture2D(uTexture, vUv);
	// gl_FragColor = vec4(color);
	// gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 );
	gl_FragColor = texture2D(uTexture, vUv);
	#ifdef USE_FOG
			#ifdef USE_LOGDEPTHBUF_EXT
					float depth = gl_FragDepthEXT / gl_FragCoord.w;
			#else
					float depth = gl_FragCoord.z / gl_FragCoord.w;
			#endif
			float fogFactor = smoothstep( uFogNear, uFogFar, depth );
			gl_FragColor.rgb = mix( gl_FragColor.rgb, uFogColor, fogFactor );
	#endif
}