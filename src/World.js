import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class World {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:"high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.position.set(0,0,20);
        
        // Lighting
        this.scene.add(new THREE.AmbientLight(0x404040, 2));
        const light = new THREE.PointLight(0x00f3ff, 2, 50);
        light.position.set(5,5,5);
        this.scene.add(light);

        // Dyson Sphere
        const geo = new THREE.OctahedronGeometry(0.2, 0);
        const mat = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.2, emissive:0x00f3ff, emissiveIntensity:0.2 });
        this.mesh = new THREE.InstancedMesh(geo, mat, 800);
        const dummy = new THREE.Object3D();
        for(let i=0; i<800; i++) {
            const theta = i * 2.399; // Golden angle
            const y = 1 - (i/799)*2;
            const r = Math.sqrt(1-y*y);
            dummy.position.set(Math.cos(theta)*r*6, y*6, Math.sin(theta)*r*6);
            dummy.lookAt(0,0,0);
            dummy.scale.setScalar(1 + Math.random());
            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);
        }
        this.scene.add(this.mesh);

        // PostFX
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85));

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth/window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    warp() { 
        // Simple cinematic warp effect
        const tl = setInterval(() => {
            this.camera.position.z -= 0.1;
            if(this.camera.position.z < 10) clearInterval(tl);
        }, 16);
    }
    start() { 
        this.renderer.setAnimationLoop(() => {
            this.mesh.rotation.y += 0.002;
            this.mesh.rotation.z += 0.001;
            this.composer.render();
        });
    }
}
