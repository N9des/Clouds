import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';

import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

export default class Sketch {
	constructor() {
		// Sizes
		this.sizes = {
			width: window.innerWidth,
			height: window.innerHeight,
		};
		// Init Renderer
		this.canvas = document.querySelector('canvas.webgl');

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
		});
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.utils = {
			rand: (min, max) => Math.random() * (max - min) + min,
			lerp: (s, e, v) => s * (1 - v) + e * v,
		};

		// Init scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#7FB2F0');

		this.addLoader();

		this.addCamera();

		// this.addControls();

		this.addMesh();

		this.addDebug();

		// Init values
		this.time = 0;
		this.clock = new THREE.Clock();
		this.lastY = 0;
		this.deltaY = 0;
		this.amount = 0;
		this.isScrolling = false;
		this.multiplier = 0.1;

		this.render();

		// Resize
		window.addEventListener('resize', this.resize.bind(this));

		window.addEventListener('wheel', this.onWheel.bind(this), {
			passive: false,
		});

		if ('ontouchstart' in window) {
			console.log('ontouchstart');
			window.addEventListener('touchstart', this.onTouchStart.bind(this), {
				passive: false,
			});
			window.addEventListener('touchmove', this.onTouchMove.bind(this), {
				passive: false,
			});
		}
	}

	adjustMixers(deltaY) {
		this.deltaY = Math.round(deltaY) * 0.01;
		this.speed = deltaY > 0 ? 1 : -1;
		this.amount = this.clock.getDelta() * this.speed;
		this.multiplier = this.amount / 10;
	}
	onWheel(e) {
		e.preventDefault();
		this.isScrolling = true;
		this.adjustMixers(e.deltaY);
	}

	onTouchStart(e) {
		e.preventDefault();
		this.lastY = e.touches[0].pageY;
	}

	onTouchMove(e) {
		e.preventDefault();
		const currentY = e.touches[0].pageY;
		const deltaY = this.lastY - currentY;
		this.lastY = currentY;
		this.adjustMixers(deltaY);
	}

	addLoader() {
		this.textureLoader = new THREE.TextureLoader();
		this.cloudsTexture = this.textureLoader.load('/images/cloud.png');
		this.clouds2Texture = this.textureLoader.load('/images/cloud_2.png');
	}

	addControls() {
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
	}

	addCamera() {
		this.camera = new THREE.PerspectiveCamera(
			70,
			this.sizes.width / this.sizes.height,
			0.01,
			20
		);
		this.camera.position.z = -1;
		this.camera.lookAt(0, 0, 200);
	}

	addMesh() {
		this.fog = new THREE.Fog(0x4584b4, 1, 20);
		this.scene.fog = this.fog;

		this.plane = new THREE.PlaneGeometry(2, 2);

		// this.material = new THREE.MeshBasicMaterial({
		// 	side: THREE.DoubleSide,
		// 	transparent: true,
		// 	opacity: 0.9,
		// 	alphaMap: this.cloudsTexture,
		// 	depthTest: false,
		// 	depthWrite: false,
		// 	alphaTest: 0.01,
		// });

		this.material = new THREE.ShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				uTexture: { value: this.cloudsTexture },
			},
			side: THREE.DoubleSide,
		});

		this.count = 4000;

		for (let i = 0; i < this.count; i++) {
			this.mesh = new THREE.Mesh(this.plane, this.material);
			this.mesh.position.x = Math.random() * 20 - 10;
			this.mesh.position.y = this.utils.rand(-1.5, -0.8);
			this.mesh.position.z = this.utils.rand(-1, 100);
			this.mesh.rotation.z = Math.random() * Math.PI;
			this.mesh.scale.x = this.mesh.scale.y =
				Math.random() * Math.random() * 1.5 + 0.5;
			this.scene.add(this.mesh);
		}
	}

	addDebug() {
		const gui = new dat.GUI();
	}

	addAnim() {
		const elapsedTime = this.clock.getElapsedTime();

		// Flying camera
		if (this.deltaY !== 0) {
			this.camera.position.z = this.camera.position.z + this.deltaY;
		}
		//  Reset camera position
		if (this.camera.position.z > 95) {
			this.camera.position.z = -1;
		} else if (this.camera.position.z < -1) {
			this.camera.position.z = 95;
		}
	}

	resize() {
		// Update sizes
		this.sizes.width = window.innerWidth;
		this.sizes.height = window.innerHeight;

		// Update camera
		this.camera.aspect = this.sizes.width / this.sizes.height;
		this.camera.updateProjectionMatrix();

		// Update renderer
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	render() {
		this.addAnim();

		// Update controls
		// this.controls.update();

		this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch();
