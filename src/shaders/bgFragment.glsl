uniform float uTime;
uniform float uSpeed;
uniform float uBase;
uniform float uSecond;
uniform vec2 uFrequency;

varying vec3 vPosition;

// NOISE
// float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
// vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
// vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

// float noise(vec3 p){
//     vec3 a = floor(p);
//     vec3 d = p - a;
//     d = d * d * (3.0 - 2.0 * d);

//     vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
//     vec4 k1 = perm(b.xyxy);
//     vec4 k2 = perm(k1.xyxy + b.zzww);

//     vec4 c = k2 + a.zzzz;
//     vec4 k3 = perm(c);
//     vec4 k4 = perm(c + 1.0);

//     vec4 o1 = fract(k3 * (1.0 / 41.0));
//     vec4 o2 = fract(k4 * (1.0 / 41.0));

//     vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
//     vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

//     return o4.y * d.y + o4.x * (1.0 - d.y);
// }

// 	<www.shadertoy.com/view/XsX3zB>
//	by Nikita Miropolskiy

/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

const float F3 =  0.3333333;
const float G3 =  0.1666667;
float snoise(vec3 p) {

	vec3 s = floor(p + dot(p, vec3(F3)));
	vec3 x = p - s + dot(s, vec3(G3));
	 
	vec3 e = step(vec3(0.0), x - x.yzx);
	vec3 i1 = e*(1.0 - e.zxy);
	vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	vec3 x1 = x - i1 + G3;
	vec3 x2 = x - i2 + 2.0*G3;
	vec3 x3 = x - 1.0 + 3.0*G3;
	 
	vec4 w, d;
	 
	w.x = dot(x, x);
	w.y = dot(x1, x1);
	w.z = dot(x2, x2);
	w.w = dot(x3, x3);
	 
	w = max(0.6 - w, 0.0);
	 
	d.x = dot(random3(s), x);
	d.y = dot(random3(s + i1), x1);
	d.z = dot(random3(s + i2), x2);
	d.w = dot(random3(s + 1.0), x3);
	 
	w *= w;
	w *= w;
	d *= w;
	 
	return dot(d, vec4(52.0));
}

float snoiseFractal(vec3 m) {
	return   0.5333333* snoise(m)
				+0.2666667* snoise(2.0*m)
				+0.1333333* snoise(4.0*m)
				+0.0666667* snoise(8.0*m);
}

float squares(vec2 uv, float offset) {
	return smoothstep(
		0.0, 0.5 + offset * 0.5,
		abs(0.5 * (sin(uv.x * uFrequency.x) * sin(uv.y * uFrequency.y) + offset * 2.0))
	);
}

void main() {
	// vec3 purple = vec3(134.0/255.0, 132.0/255.0, 228.0/255.0);
	// vec3 green = vec3(228.0/255.0, 249.0/255.0, 158.0/255.0);
	// vec3 grey = vec3(176.0/255.0, 185.0/255.0, 197.0/255.0);

	vec3 color1 = vec3(176.0/255.0, 185.0/255.0, 197.0/255.0);
	vec3 color2 = vec3(228.0/255.0, 249.0/255.0, 158.0/255.0);
	vec3 color3 = vec3(134.0/255.0, 132.0/255.0, 228.0/255.0);
	float n = snoiseFractal(vPosition + (uTime * uSpeed));

	vec2 baseUv = n * vPosition.xy;
	float basePattern = squares(baseUv, uBase);
	float secondPattern = squares(baseUv, uSecond);

	vec3 baseColor = mix(color1, color2, basePattern);
	vec3 secondColor = mix(baseColor, color3, secondPattern);

	gl_FragColor = vec4( vec3(secondColor), 1.0 );
}