import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
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
		this.renderer.localClippingEnabled = true;

		// Utils
		this.utils = {
			rand: (min, max) => Math.random() * (max - min) + min,
			lerp: (s, e, v) => s * (1 - v) + e * v,
			clamp: (num, min, max) => Math.min(Math.max(num, min), max),
		};
		// Init values
		this.time = 0;
		this.elapsedTime = 0;
		this.clock = new THREE.Clock();
		this.sceneDepth = -100;
		this.scroll = 0;
		this.delta = 0;
		this.down = false;
		this.world = null;
		this.meshBodies = [];
		this.model = null;
		this.children = [];
		this.letters = [];
		this.found = null;
		this.mouseClick = new THREE.Vector2();
		this.mouseMove = new THREE.Vector2();
		this.draggable = null;
		this.speedsPos = [1, 0.8, 1.2, 1.4, 1.2];
		this.speedsRot = [1, 1.1, 1.2, 1.4, 1.2];
		this.lerpMultiplier = 0.005;
		this.button = document.querySelector('.anim');
		this.isStatic = true;
		this.titleCoverTop = [];
		this.titleCoverBottom = [];
		this.titleCoverGroup = new THREE.Group();

		// Init scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#7FB2F0');
		THREE.ColorManagement.enabled = false;

		// Init Lenis
		this.initLenis();

		this.addCamera();

		this.addLights();

		this.addRaycaster();

		this.addCannonWorld();

		this.addLoader();

		// this.addControls();

		this.addBg();

		this.addClouds();

		this.initPost();

		this.addDebug();

		this.render();

		// Resize
		window.addEventListener('resize', this.resize.bind(this));

		// Mouse event
		window.addEventListener('mousedown', (event) => {
			this.mouseClick.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.mouseClick.y = -(event.clientY / this.sizes.height) * 2 + 1;
			this.lerpMultiplier = 0.005;

			this.found = this.getIntersect(this.mouseClick);

			if (this.found.length > 0) {
				if (this.found[0].object.userData.draggable) {
					this.draggable = this.found[0].object.userData.id;
				}
			}

			this.down = true;
		});

		window.addEventListener('mouseup', (event) => {
			if (this.draggable !== null) {
				this.lerpMultiplier = 0.05;

				this.draggable = null;

				setTimeout(() => {
					this.down = false;
				}, 1000);
			}
		});

		window.addEventListener('mousemove', (event) => {
			this.mouseMove.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.mouseMove.y = -(event.clientY / this.sizes.height) * 2 + 1;
		});

		const button = document.querySelector('.anim');
		const tl = gsap.timeline({
			duration: 1,
			ease: 'power1.inOut',
		});
		button.addEventListener('click', () => {
			tl.to(this.titleCoverTop.position, {
				y: -0.5,
				duration: 1.5,
			})
				.to(
					this.titleCoverBottom.position,
					{
						y: 0.5,
						duration: 1.5,
					},
					'<'
				)
				.to(
					this.titleCoverTop.rotation,
					{
						z: -0.2,
						duration: 1.5,
					},
					'<'
				)
				.to(
					this.titleCoverBottom.rotation,
					{
						z: -0.2,
						duration: 1.5,
					},
					'<'
				);
		});
	}

	scrollTrigger() {
		const positions = [
			{ y: 2, x: -2, z: 1 },
			{ y: 1, x: -1, z: 1 },
			{ y: 2, x: 0, z: 1 },
			{ y: 2, x: 1, z: 2 },
			{ y: 1, x: 2, z: 1 },
		];

		this.children.forEach((child, idx) => {
			gsap.to(child.curr, {
				y: child.targ.y + positions[idx].y,
				x: child.targ.x + positions[idx].x,
				z: child.targ.z + positions[idx].z,
				scrollTrigger: {
					trigger: this.canvas,
					scrub: 1,
					start: 'top',
					end: '+=50',
					snap: {
						snapTo: 1,
						duration: { min: 0.2, max: 0.8 },
						ease: 'power1.inOut',
					},
					markers: true,
				},
			});
		});
	}

	initLenis() {
		const lenis = new Lenis({
			lerp: 0.1,
			wheelMultiplier: 0.05,
			touchMultiplier: 0.05,
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

	addRaycaster() {
		this.raycaster = new THREE.Raycaster();
	}

	addCannonWorld() {
		this.world = new CANNON.World();
		this.world.gravity.set(0, 0, 0);
	}

	addLoader() {
		const localPlaneTop = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
		const helperPlane = new THREE.PlaneHelper(localPlaneTop, 2, 0xff0000);
		const localPlaneBottom = new THREE.Plane(
			new THREE.Vector3(0, -1, 0),
			-0.08
		);
		const helperPlaneBottom = new THREE.PlaneHelper(
			localPlaneBottom,
			2,
			0x0000ff
		);
		// this.scene.add(helperPlane, helperPlaneBottom);

		this.fontLoader = new FontLoader();
		const creativeTitle = Array.from('Creative');
		const webTitle = Array.from('web');
		const developerTitle = Array.from('developer');
		const creativeTitlePosX = [0.03, 0.13, 0.22, 0.31, 0.4, 0.465, 0.515, 0.61];
		const webTitlePosX = [0.755, 0.91, 1];
		const developerTitlePosX = [
			0.155, 0.252, 0.345, 0.445, 0.54, 0.59, 0.685, 0.78, 0.875,
		];

		this.fontLoader.load('./fonts/humane/humane.json', (font) => {
			const materialTop = new THREE.MeshStandardMaterial({
				color: 0xdbf38c,
				clippingPlanes: [localPlaneTop],
				name: 'top',
			});

			const materialBottom = new THREE.MeshStandardMaterial({
				color: 0xdbf38c,
				clippingPlanes: [localPlaneBottom],
				name: 'bottom',
			});

			this.addTitles('Creative web', materialTop, font, 0, 0.1);
			this.addTitles('developer', materialBottom, font, 0.15, -0.35);

			this.scene.add(this.titleCoverGroup);
			this.titleCoverGroup.position.x = -0.55;
			this.titleCoverGroup.position.z = -0.7;
		});

		this.textureLoader = new THREE.TextureLoader();
		this.cloudsTexture = this.textureLoader.load('/images/cloud.png');
		this.clouds2Texture = this.textureLoader.load('/images/cloud_2.png');

		this.loader = new GLTFLoader();
		this.loader.load('./models/letters.glb', (gltf) => {
			this.model = gltf.scene;

			// Store all letters in an array
			this.model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					this.letters.push(child);
				}
			});

			// Add each letter as a mesh in our scene
			for (let i = 0; i < this.letters.length; i++) {
				const mesh = this.letters[i];
				const name = mesh.name.toLowerCase();

				if (name === 'f') {
					this.addBalloon(mesh, -0.45, 0);
				} else if (name === 'e') {
					this.addBalloon(mesh, -0.23, 1);
				} else if (name === 'l') {
					this.addBalloon(mesh, 0, 2);
				} else if (name === 'i') {
					this.addBalloon(mesh, 0.22, 3);
				} else {
					this.addBalloon(mesh, 0.45, 4);
				}
			}

			this.onAnim();
			this.scrollTrigger();
		});
	}

	addLights() {
		const white = 0xffffff;
		const intensity = 6;
		this.spotLight = new THREE.SpotLight(white, intensity);
		this.spotLight.position.set(1, 1, 1);
		this.scene.add(this.spotLight);

		this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
		// this.scene.add(this.spotLightHelper);

		const green = 0xf9f863;
		const intensityGreen = 1.5;
		this.pointLight = new THREE.SpotLight(white, intensityGreen);
		this.pointLight.lookAt(0, 0, 0);
		this.pointLight.position.set(0, -1.5, 0);
		this.scene.add(this.pointLight);

		this.pointLightHelper = new THREE.SpotLightHelper(this.pointLight);
		// this.scene.add(this.pointLightHelper);

		const intensityWhite = 2;
		this.pointLightWhite = new THREE.PointLight(white, intensityWhite);
		this.pointLightWhite.position.set(-1, 1, 1);
		this.scene.add(this.pointLightWhite);

		this.pointLightWhiteHelper = new THREE.PointLightHelper(
			this.pointLightWhite
		);
		// this.scene.add(this.pointLightWhiteHelper);

		const intensityAmbient = 2;
		this.ambientLight = new THREE.AmbientLight(white, intensityAmbient);
		this.scene.add(this.ambientLight);
	}

	addTitles(title, material, font, posX, posY) {
		const titleGeometry = new TextGeometry(title, {
			font: font,
			size: 0.29,
			height: 0,
		});

		const titleMesh = new THREE.Mesh(titleGeometry, material);
		titleMesh.position.set(posX, posY, 0);
		this.titleCoverGroup.add(titleMesh);

		if (material.name === 'top') {
			this.titleCoverTop = titleMesh;
		} else {
			this.titleCoverBottom = titleMesh;
		}
	}

	addTitleLetters(letter, material, font, posX, posY, position) {
		const letterGeometry = new TextGeometry(letter, {
			font: font,
			size: 0.29,
			height: 0,
		});

		const letterMesh = new THREE.Mesh(letterGeometry, material);
		this.titleCoverGroup.add(letterMesh);
		letterMesh.position.set(posX, posY, -0.7);

		if (position) {
			this.titleCoverTop.push(letterMesh.position);
		} else {
			this.titleCoverBottom.push(letterMesh.position);
		}
	}

	addBalloon(mesh, posX = 0, index) {
		// Create balloon
		mesh.scale.set(0.3, 0.3, 0.3);
		mesh.position.set(posX, 0, -0.6);
		mesh.userData.draggable = true;
		mesh.userData.id = index;
		mesh.material = new THREE.MeshStandardMaterial({
			color: 0x7b79eb,
			metalness: 0.3,
			roughness: 0.4,
		});
		this.scene.add(mesh);

		// Add physics mesh on balloon
		const meshShape = new CANNON.Sphere(0.11);
		const meshShapeTop = new CANNON.Sphere(0.08);
		const meshShapeBottom = new CANNON.Sphere(0.08);
		const meshBody = new CANNON.Body({
			mass: 1,
			velocity: new CANNON.Vec3(0.1, 0.1, 0),
			angularFactor: new CANNON.Vec3(0, 0, 0),
		});
		meshBody.addShape(meshShape, new CANNON.Vec3(0, 0, 0));
		meshBody.addShape(meshShapeTop, new CANNON.Vec3(0, 0.05, 0));
		meshBody.addShape(meshShapeBottom, new CANNON.Vec3(0, -0.05, 0));
		meshBody.position.x = mesh.position.x;
		meshBody.position.y = mesh.position.y;
		meshBody.position.z = mesh.position.z;
		Object.assign(meshBody, { balloonID: index });
		this.world.addBody(meshBody);
		this.meshBodies.push(meshBody);

		// Add bg plane for balloon
		const planeGeo = new THREE.PlaneGeometry(0.2, 0.2);
		const planeMat = new THREE.MeshNormalMaterial();
		const planeMesh = new THREE.Mesh(planeGeo, planeMat);
		planeMesh.position.set(meshBody.position.x, meshBody.position.y, -0.6);
		planeMesh.visible = false;
		this.scene.add(planeMesh);

		// Add physics to plane
		const planeShape = new CANNON.Plane();
		const planeBody = new CANNON.Body({
			mass: 0,
			shape: planeShape,
		});
		planeBody.position.x = planeMesh.position.x;
		planeBody.position.y = planeMesh.position.y;
		planeBody.position.z = planeMesh.position.z;
		this.world.addBody(planeBody);

		// Add constraint point between plane and balloon
		const localPivotBody = new CANNON.Vec3(0, 0, 0.6);
		const localPivotPlane = new CANNON.Vec3(0, 0, -planeBody.position.z);
		const constraints = new CANNON.PointToPointConstraint(
			meshBody,
			localPivotBody,
			planeBody,
			localPivotPlane
		);
		this.world.addConstraint(constraints);

		// Add mesh to an array
		this.children[index] = {
			mesh,
			posX,
			targ: {
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				zRot: mesh.rotation.z,
			},
			curr: {
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				zRot: mesh.rotation.z,
			},
		};
	}

	getIntersect(pos) {
		this.raycaster.setFromCamera(pos, this.camera);
		return this.raycaster.intersectObjects(this.letters);
	}

	dragObject() {
		if (this.draggable !== null) {
			if (this.found !== null && this.found.length > 0) {
				for (let i = 0; i < this.found.length; i++) {
					const index = this.found[i].object.userData.id;

					this.children[index].targ.x = this.mouseMove.x;
					this.children[index].targ.y = this.mouseMove.y;
				}
			}
		}
	}

	staticAnim() {
		this.children.forEach((child, idx) => {
			const rotationZ = Math.sin(this.elapsedTime * this.speedsRot[idx]) * 0.1;
			child.targ.zRot = rotationZ;
		});
	}

	moveBalloons() {
		// Balloon mouvement
		const child = this.children.find(
			(x) => x.mesh.userData.id === this.draggable
		);

		if (child && child.mesh) {
			const meshBody = this.meshBodies.find(
				(m) => m.balloonID === this.draggable
			);

			meshBody.position.x = child.curr.x;
			meshBody.position.y = child.curr.y;
			meshBody.position.z = child.curr.z;
			meshBody.velocity.set(0, 0, 0);
			meshBody.angularVelocity.set(0, 0, 0);
		}

		const children = this.children.filter(
			(x) => x.mesh.userData.id !== this.draggable
		);

		for (const child of children) {
			const meshBody = this.meshBodies.find(
				(m) => m.balloonID === child.mesh.userData.id
			);

			child.targ.x = meshBody.position.x;
			child.targ.y = meshBody.position.y;
			child.targ.z = meshBody.position.z;
		}
	}

	addControls() {
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
	}

	addCamera() {
		this.camera = new THREE.PerspectiveCamera(
			90,
			this.sizes.width / this.sizes.height,
			0.01,
			40
		);
	}

	addBg() {
		const sphere = new THREE.SphereGeometry(1.5, 25, 25);

		this.bgMaterial = new THREE.ShaderMaterial({
			vertexShader: bgVertexShader,
			fragmentShader: bgFragmentShader,
			depthWrite: false,
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
		const plane = new THREE.PlaneGeometry(2, 2);

		// const cloudsMaterial = new THREE.MeshBasicMaterial({
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
			// depthTest: false,
			depthWrite: false,
			uniforms: {
				uTexture: { value: this.cloudsTexture },
			},
			side: THREE.DoubleSide,
		});

		this.count = 2200;

		for (let i = 0; i < this.count; i++) {
			this.cloud = new THREE.Mesh(plane, cloudsMaterial);
			this.cloud.position.x = Math.random() * 20 - 10;
			this.cloud.position.y = this.utils.rand(-2, -1.15);
			this.cloud.position.z = this.utils.rand(-110, 1);
			this.cloud.rotation.z = Math.random() * Math.PI;
			this.cloud.scale.x = this.cloud.scale.y =
				Math.random() * Math.random() * 1.5 + 0.5;
			this.scene.add(this.cloud);
		}
	}

	addDebug() {
		// const gui = new GUI();
		// this.cannonDebugger = new CannonDebugger(this.scene, this.world, {});
	}

	onAnim() {
		this.elapsedTime = this.clock.getElapsedTime();

		// Balloon
		if (this.model) {
			this.children.forEach((child) => {
				child.curr.x = this.utils.lerp(child.curr.x, child.targ.x, 0.5);
				child.curr.y = this.utils.lerp(child.curr.y, child.targ.y, 0.5);
				child.curr.z = this.utils.lerp(child.curr.z, child.targ.z, 0.5);
				child.curr.zRot = this.utils.lerp(
					child.curr.zRot,
					child.targ.zRot,
					0.5
				);

				child.mesh.position.x = child.curr.x;
				child.mesh.position.y = child.curr.y;
				child.mesh.position.z = child.curr.z;
				child.mesh.rotation.z = child.curr.zRot;
			});

			// Grab/Drop anim
			this.dragObject();
			// Move Balloons out of drag
			this.moveBalloons();
			// Static anim
			this.staticAnim();
		}

		// Flying camera
		this.camera.position.z = this.scroll * this.sceneDepth;
		this.bg ? (this.bg.position.z = this.camera.position.z) : null;

		// Update uTime shader uniform
		this.bgMaterial
			? (this.bgMaterial.uniforms.uTime.value = this.elapsedTime)
			: null;
	}

	resize() {
		// Update sizes
		this.sizes.width = window.innerWidth;
		this.sizes.height = window.innerHeight;

		// Update camera
		this.camera.aspect = this.sizes.width / this.sizes.height;
		this.camera.updateProjectionMatrix();

		// Update renderer
		// this.composer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		// this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	render() {
		this.delta = Math.min(this.clock.getDelta(), 0.1);

		// Update World
		this.world.step(this.delta);
		this.cannonDebugger && this.cannonDebugger.update();

		this.onAnim();

		// Update text
		// this.text && this.text.sync();

		// Update controls
		this.controls && this.controls.update();

		// Render
		// this.composer.render(this.scene, this.camera);
		// this.composer.outputColorSpace = THREE.LinearSRGBColorSpace;
		this.renderer.render(this.scene, this.camera);
		this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch();
