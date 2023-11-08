import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';
import Lenis from '@studio-freight/lenis';

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
		// Utils
		this.utils = {
			rand: (min, max) => Math.random() * (max - min) + min,
			lerp: (s, e, v) => s * (1 - v) + e * v,
			clamp: (num, min, max) => Math.min(Math.max(num, min), max),
		};
		// Init values
		this.time = 0;
		this.clock = new THREE.Clock();
		this.sceneDepth = 100;
		this.scroll = 0;

		// Init scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#7FB2F0');

		// Init Lenis
		this.initLenis();

		this.addLoader();

		this.addCamera();

		// this.addControls();

		this.addClouds();

		this.addDebug();

		this.render();

		// Resize
		window.addEventListener('resize', this.resize.bind(this));
	}

	initLenis() {
		const lenis = new Lenis({
			lerp: 0.015,
			wheelMultiplier: 0.05,
			smoothTouch: true,
		});

		lenis.on('scroll', (e) => {
			this.scroll = e.progress;
		});

		function raf(time) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}

		requestAnimationFrame(raf);
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
		this.camera.position.z = 0;
		this.camera.lookAt(0, 0, 200);
	}

	addClouds() {
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
			this.mesh.position.y = this.utils.rand(-2, -1.15);
			this.mesh.position.z = this.utils.rand(-1, 110);
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
		this.camera.position.z = this.scroll * this.sceneDepth;
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
