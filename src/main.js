import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as dat from 'lil-gui';
import Lenis from '@studio-freight/lenis';

import { DotScreenShader } from './customShader';

import cloudsVertexShader from './shaders/cloudsVertex.glsl';
import cloudsFragmentShader from './shaders/cloudsFragment.glsl';
import bgVertexShader from './shaders/bgVertex.glsl';
import bgFragmentShader from './shaders/bgFragment.glsl';

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
		this.renderer.autoClear = false;
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

		this.addBg();

		this.addClouds();

		this.initPost();

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

	initPost() {
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));

		const effect = new ShaderPass(DotScreenShader);
		effect.uniforms['scale'].value = 4;
		this.composer.addPass(effect);
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
			40
		);
		this.camera.position.z = 0;
		this.camera.lookAt(0, 0, 200);
	}

	addBg() {
		const sphere = new THREE.SphereGeometry(1.5, 25, 25);

		this.bgMaterial = new THREE.ShaderMaterial({
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uSpeed: { value: 0.01 },
				uBase: { value: 0.1 },
				uSecond: { value: 0.5 },
				uFrequency: { value: new THREE.Vector2(15, 15) },
			},
			side: THREE.DoubleSide,
		});

		this.bg = new THREE.Mesh(sphere, this.bgMaterial);
		this.bg.position.z = this.camera.position.z;
		this.bg.position.x = this.camera.position.x;
		this.bg.position.y = this.camera.position.y;
		this.scene.add(this.bg);
	}

	addClouds() {
		const cloudsGroup = new THREE.Group();
		const plane = new THREE.PlaneGeometry(2, 2);

		// this.material = new THREE.MeshBasicMaterial({
		// 	side: THREE.DoubleSide,
		// 	transparent: true,
		// 	opacity: 0.9,
		// 	alphaMap: this.cloudsTexture,
		// 	depthTest: false,
		// 	depthWrite: false,
		// 	alphaTest: 0.01,
		// });

		const cloudsMaterial = new THREE.ShaderMaterial({
			vertexShader: cloudsVertexShader,
			fragmentShader: cloudsFragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				uTexture: { value: this.cloudsTexture },
			},
			side: THREE.DoubleSide,
		});

		this.count = 1800;

		for (let i = 0; i < this.count; i++) {
			this.cloud = new THREE.Mesh(plane, cloudsMaterial);
			this.cloud.position.x = Math.random() * 20 - 10;
			this.cloud.position.y = this.utils.rand(-2, -1.15);
			this.cloud.position.z = this.utils.rand(-1, 110);
			this.cloud.rotation.z = Math.random() * Math.PI;
			this.cloud.scale.x = this.cloud.scale.y =
				Math.random() * Math.random() * 1.5 + 0.5;
			cloudsGroup.add(this.cloud);
		}
		this.scene.add(cloudsGroup);
	}

	addDebug() {
		const gui = new dat.GUI();
	}

	addAnim() {
		const elapsedTime = this.clock.getElapsedTime();

		// Flying camera
		this.camera.position.z = this.scroll * this.sceneDepth;
		this.bg.position.z = this.camera.position.z;

		// Update uTime shader uniform
		this.bgMaterial.uniforms.uTime.value = elapsedTime;
	}

	resize() {
		// Update sizes
		this.sizes.width = window.innerWidth;
		this.sizes.height = window.innerHeight;

		// Update camera
		this.camera.aspect = this.sizes.width / this.sizes.height;
		this.camera.updateProjectionMatrix();

		// Update renderer
		this.composer.setSize(this.sizes.width, this.sizes.height);
		this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		// this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	render() {
		this.addAnim();

		// Update controls
		// this.controls.update();

		// Render
		this.composer.render(this.scene, this.camera);
		// this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch();
