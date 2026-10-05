import * as THREE from "three";

import {
    GLTFLoader
} from "three/examples/jsm/loaders/GLTFLoader.js";

import {
    VRButton
} from "three/examples/jsm/webxr/VRButton.js";

import UserControls from "./userController.js";

import { physics } from "./physics.js";

class SceneManager {
    constructor(container) {
        this.container = container;

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.loader = new GLTFLoader();

        this.currentModel = null;

        this.controls = null;

        this.clock = new THREE.Clock();

        this.mixer = null;

        this.initialized = false;

        this.animate =
            this.animate.bind(this);

        this.onResize =
            this.onResize.bind(this);
    }

    init() {
        if (this.initialized) return;

        // Scene
        this.scene = new THREE.Scene();

        this.scene.background =
            new THREE.Color(0x101010);

        // Camera
        this.camera =
            new THREE.PerspectiveCamera(
                75,
                window.innerWidth /
                window.innerHeight,
                0.1,
                1000
            );

        this.camera.position.set(
            0,
            1.6,
            5
        );

        // Renderer
        this.renderer =
            new THREE.WebGLRenderer({
                antialias: true,
            });

        this.renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        this.renderer.xr.enabled = true;

        this.container.appendChild(
            this.renderer.domElement
        );

        // VR
        this.vrButton =
            VRButton.createButton(
                this.renderer
            );

        if (this.vrButton) {
            this.container.appendChild(
                this.vrButton
            );
        }

        // Lighting
        this.createLighting();

        // Physics
        physics.setPlayerPosition(
            new THREE.Vector3(
                0,
                0,
                5
            )
        );

        // Controls
        this.controls =
            new UserControls(
                this.camera,
                this.renderer.domElement,
                physics
            );

        this.controls.enable();

        // Resize
        window.addEventListener(
            "resize",
            this.onResize
        );

        // Start rendering
        this.renderer.setAnimationLoop(
            this.animate
        );

        this.initialized = true;
    }

    createLighting() {
        const ambientLight =
            new THREE.HemisphereLight(
                0xffffff,
                0x444444,
                2
            );

        this.scene.add(
            ambientLight
        );

        const directionalLight =
            new THREE.DirectionalLight(
                0xffffff,
                2
            );

        directionalLight.position.set(
            10,
            20,
            10
        );

        directionalLight.castShadow = true;

        this.scene.add(
            directionalLight
        );
    }

    async loadGLB(file) {
        if (!this.initialized) {
            this.init();
        }

        const url =
            file instanceof File ||
                file instanceof Blob
                ? URL.createObjectURL(file)
                : file;

        return new Promise(
            (resolve, reject) => {
                this.loader.load(
                    url,

                    (gltf) => {
                        this.removeCurrentModel();

                        this.currentModel =
                            gltf.scene;

                        this.scene.add(
                            this.currentModel
                        );

                        // Animations
                        if (
                            gltf.animations &&
                            gltf.animations.length
                        ) {
                            this.mixer =
                                new THREE.AnimationMixer(
                                    this.currentModel
                                );

                            gltf.animations.forEach(
                                (clip) => {
                                    const action =
                                        this.mixer.clipAction(
                                            clip
                                        );

                                    action.play();
                                }
                            );
                        }

                        // Build collision data
                        physics.setWorld(
                            this.currentModel
                        );

                        if (
                            file instanceof File ||
                            file instanceof Blob
                        ) {
                            URL.revokeObjectURL(
                                url
                            );
                        }

                        resolve(
                            this.currentModel
                        );
                    },

                    undefined,

                    (error) => {
                        if (
                            file instanceof File ||
                            file instanceof Blob
                        ) {
                            URL.revokeObjectURL(
                                url
                            );
                        }

                        reject(error);
                    }
                );
            }
        );
    }

    removeCurrentModel() {
        if (!this.currentModel) {
            return;
        }

        this.scene.remove(
            this.currentModel
        );

        this.currentModel.traverse(
            (object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }

                if (object.material) {
                    if (
                        Array.isArray(
                            object.material
                        )
                    ) {
                        object.material.forEach(
                            (material) =>
                                material.dispose()
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            }
        );

        this.currentModel = null;

        this.mixer = null;
    }

    animate() {
        const delta =
            this.clock.getDelta();

        if (this.mixer) {
            this.mixer.update(delta);
        }

        if (
            this.controls &&
            !this.renderer.xr.isPresenting
        ) {
            this.controls.update(delta);
        }

        this.renderer.render(
            this.scene,
            this.camera
        );
    }

    onResize() {
        if (!this.camera || !this.renderer) {
            return;
        }

        this.camera.aspect =
            window.innerWidth /
            window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }

    enterVR() {
        if (!this.renderer.xr.enabled) {
            this.renderer.xr.enabled = true;
        }

        // VRButton handles the actual
        // WebXR session.
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    getModel() {
        return this.currentModel;
    }

    dispose() {
        this.controls?.disable();

        window.removeEventListener(
            "resize",
            this.onResize
        );

        this.renderer?.setAnimationLoop(
            null
        );

        this.removeCurrentModel();

        this.renderer?.dispose();

        this.renderer?.domElement?.remove();
        this.vrButton?.remove();
        this.initialized = false;
    }
}

export { SceneManager };
export default SceneManager;