import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

import UserControls from "./userController.js";
import { physics } from "./physics.js";
import { assetManager } from "./assetsManager.js";
import { MemoryBuffer } from "./Buffer.js";
import { disposeGLTF } from "./Gltfutils.js";

const MAX_CACHED_MODELS = 4;

/** Static models never need per-frame matrix recalculation. */
function freezeStatic(scene) {
  scene.updateMatrixWorld(true);

  scene.traverse((object) => {
    if (object !== scene) object.matrixAutoUpdate = false;
  });
}

class SceneManager {
  constructor(container) {
    this.container = container;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.loader = new GLTFLoader();

    // Parsed models kept in memory (geometry/textures stay on the GPU)
    this.models = new MemoryBuffer({
      maxSize: MAX_CACHED_MODELS,
      onEvict: (key, entry) => {
        physics.releaseWorld(entry.gltf.scene);
        disposeGLTF(entry.gltf);
      },
    });

    this.pending = new Map();
    this.loadToken = 0;

    this.current = null; // { key, gltf }
    this.mixer = null;

    this.controls = null;
    this.clock = new THREE.Clock();
    this.initialized = false;

    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  /* ------------------------------- setup ------------------------------- */

  init() {
    if (this.initialized) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101010);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    this.vrButton = VRButton.createButton(this.renderer);
    if (this.vrButton) this.container.appendChild(this.vrButton);

    this.createLighting();

    physics.setPlayerPosition(new THREE.Vector3(0, 0, 5));

    this.controls = new UserControls(
      this.camera,
      this.renderer.domElement,
      physics
    );
    this.controls.enable();

    window.addEventListener("resize", this.onResize);

    this.renderer.setAnimationLoop(this.animate);

    this.initialized = true;
  }

  createLighting() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

    // No castShadow: the renderer's shadow map isn't enabled, so it was
    // never doing anything. Turn both on together if you want shadows.
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(10, 20, 10);
    this.scene.add(sun);
  }

  /* ------------------------------ loading ------------------------------ */

  /**
   * Preferred entry point: load a stored asset by id.
   * Bytes come from the memory buffer, parsed models from the model cache.
   */
  async loadAsset(id) {
    return this.load(id, () => assetManager.getBuffer(id));
  }

  /**
   * Backwards-compatible: File, Blob, ArrayBuffer or URL string.
   * Pass a stable `key` to make repeat loads hit the model cache.
   */
  async loadGLB(source, key = null) {
    const cacheKey =
      key ?? (typeof source === "string" ? source : `anon:${++this.loadToken}`);

    return this.load(cacheKey, async () => {
      if (source instanceof ArrayBuffer) return source;
      if (source instanceof Blob) return source.arrayBuffer();

      const response = await fetch(source);
      if (!response.ok) throw new Error(`Failed to fetch ${source}`);

      return response.arrayBuffer();
    });
  }

  async load(key, getBuffer) {
    if (!this.initialized) this.init();

    const token = ++this.loadToken;
    const entry = await this.getEntry(key, getBuffer);

    // A newer load started while we were waiting: drop this one
    if (token !== this.loadToken) return null;

    return this.show(entry);
  }

  getEntry(key, getBuffer) {
    const cached = this.models.get(key);
    if (cached) return Promise.resolve(cached);

    if (this.pending.has(key)) return this.pending.get(key);

    const task = (async () => {
      const buffer = await getBuffer();

      // Parse straight from memory: no blob URL, no second network/disk trip
      const gltf = await this.loader.parseAsync(buffer, "");

      if (!gltf.animations?.length) freezeStatic(gltf.scene);

      const entry = { key, gltf };
      this.models.set(key, entry, 1);

      return entry;
    })().finally(() => this.pending.delete(key));

    this.pending.set(key, task);

    return task;
  }

  show(entry) {
    if (this.current === entry) return entry.gltf.scene;

    this.detach();

    const { gltf } = entry;

    this.models.pin(entry.key);
    this.scene.add(gltf.scene);
    this.current = entry;

    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach((clip) => this.mixer.clipAction(clip).play());
    }

    // Fresh spawn for each model
    physics.setPlayerPosition(new THREE.Vector3(0, 0, 5));
    physics.player.velocity.set(0, 0, 0);

    // Colliders are cached per scene, so switching back is instant
    physics.setWorld(gltf.scene);

    return gltf.scene;
  }

  /** Remove from the scene but keep in cache (no GPU re-upload on return). */
  detach() {
    if (!this.current) return;

    const { gltf, key } = this.current;

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(gltf.scene);
      this.mixer = null;
    }

    this.scene.remove(gltf.scene);
    this.models.unpin(key);
    this.current = null;
  }

  /** Remove the model and free its memory entirely. */
  removeCurrentModel() {
    if (!this.current) return;

    const { key } = this.current;

    this.detach();
    this.models.delete(key);
  }

  /** Drop one asset from the model cache (call after deleting an asset). */
  evict(key) {
    if (this.current?.key === key) this.detach();
    this.models.delete(key);
  }

  /* ----------------------------- frame loop ---------------------------- */

  /** Stop rendering/input while the viewer is hidden (keeps all caches). */
  pause() {
    if (!this.initialized) return;
    this.renderer.setAnimationLoop(null);
    this.controls?.disable();
  }

  resume() {
    if (!this.initialized) return;
    this.clock.getDelta(); // discard the time spent paused
    this.renderer.setAnimationLoop(this.animate);
    this.controls?.enable();
  }

  animate() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.mixer?.update(delta);

    if (this.controls && !this.renderer.xr.isPresenting) {
      this.controls.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  enterVR() {
    // VRButton handles the actual WebXR session.
    this.renderer.xr.enabled = true;
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
    return this.current?.gltf.scene ?? null;
  }

  dispose() {
    this.controls?.disable();

    window.removeEventListener("resize", this.onResize);
    this.renderer?.setAnimationLoop(null);

    this.detach();
    this.models.clear();

    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.vrButton?.remove();

    this.initialized = false;
  }
}

export { SceneManager };
export default SceneManager;
