import {
  Engine,
  Scene,
  UniversalCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  CubeTexture,
  ImageProcessingConfiguration,
  SceneLoader,
  MeshBuilder,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // registers the .glb/.gltf loader
import { SkyMaterial } from "@babylonjs/materials/sky";

import UserControls from "./userController.js";
import { XRManager } from "../WebXr/WebXR.js";
import { physics } from "./physics.js";
import { assetManager } from "./assetsManager.js";
import { MemoryBuffer } from "./Buffer.js";

const MAX_CACHED_MODELS = 4;

/**
 * Image-based lighting. This is what fixes "black patches": PBR (glTF)
 * materials get their reflections/ambient from an environment map, and
 * without one, metallic surfaces render black.
 *
 * This is Babylon's prefiltered default. For production, download it and
 * host it yourself (or swap in your own .env / .hdr).
 */
const ENVIRONMENT_URL =
  "https://assets.babylonjs.com/environments/environmentSpecular.env";

/** Static models never need per-frame matrix recalculation. */
function freezeStatic(container) {
  const nodes = [...container.transformNodes, ...container.meshes];
  nodes.forEach((n) => n.computeWorldMatrix(true));
  nodes.forEach((n) => n.freezeWorldMatrix());
}

class SceneManager {
  /**
   * @param {HTMLElement} container
   * @param {{ sky?: boolean, fogDensity?: number }} [options]
   *   sky: draw a procedural sky + fog (outdoor terrains). Set false for
   *        studio/character viewers that bring their own backdrop.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = { sky: true, fogDensity: 0.0025, xr: {}, ...options };
    this.skybox = null;
    this.resizeObserver = null;

    this.engine = null;
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.xrManager = null;

    // Parsed models kept in memory as AssetContainers (not in the scene,
    // but geometry/textures stay uploaded to the GPU)
    this.models = new MemoryBuffer({
      maxSize: MAX_CACHED_MODELS,
      onEvict: (key, entry) => {
        physics.releaseWorld(entry.root);
        entry.container.dispose();
      },
    });

    this.pending = new Map();
    this.loadToken = 0;

    this.current = null; // { key, container, root, animated }

    this.controls = null;
    this.initialized = false;

    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  /* ------------------------------- setup ------------------------------- */

  init() {
    if (this.initialized) return;

    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.outline = "none";
    this.container.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true, {
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: true,
    });
    this.engine.setHardwareScalingLevel(
      1 / Math.min(window.devicePixelRatio || 1, 2)
    );

    this.scene = new Scene(this.engine);

    // Match three.js / glTF coordinates so physics + controls keep working
    // and Babylon doesn't add a Z-flip root to imported models.
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = Color4.FromHexString("#101010ff");

    this.setupColorPipeline();
    if (this.options.sky) this.createSky();

    this.camera = new UniversalCamera("camera", new Vector3(0, 1.6, 5), this.scene);
    this.camera.fov = (75 * Math.PI) / 180;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.inputs.clear(); // UserControls drives the camera itself

    this.createLighting();

    physics.setPlayerPosition(new Vector3(0, 0, 5));

    this.controls = new UserControls(this.camera, this.canvas, physics);
    this.controls.enable();

    // Track the *container*, not the window, so the canvas never stretches
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.container);
    window.addEventListener("resize", this.onResize);
    this.onResize();

    this.engine.runRenderLoop(this.animate);

    this.xrManager = new XRManager(this, this.options.xr);
    this.xrManager.init();

    this.initialized = true;
  }

  /** Tone mapping + environment: the fix for black / blown-out materials. */
  setupColorPipeline() {
    const ipc = this.scene.imageProcessingConfiguration;
    ipc.toneMappingEnabled = true;
    ipc.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ipc.exposure = 1.0;
    ipc.contrast = 1.0;

    this.scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
      ENVIRONMENT_URL,
      this.scene
    );
    this.scene.environmentIntensity = 1.0;
  }

  /** Sky dome + fog: hides the edge of the terrain (the "black patch"). */
  createSky() {
    const sky = new SkyMaterial("sky", this.scene);
    sky.backFaceCulling = false;
    sky.useSunPosition = true;
    sky.sunPosition = new Vector3(100, 200, 100); // matches the DirectionalLight
    sky.turbidity = 4;
    sky.luminance = 1;
    sky.rayleigh = 2;

    this.skybox = MeshBuilder.CreateBox("skybox", { size: 900 }, this.scene);
    this.skybox.material = sky;
    this.skybox.infiniteDistance = true; // follows the camera
    this.skybox.isPickable = false;
    this.skybox.applyFog = false;

    // Fog colour ~ horizon colour so the ground fades into the sky
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = new Color3(0.72, 0.8, 0.9);
    this.scene.fogDensity = this.options.fogDensity;
    this.scene.clearColor = new Color4(0.72, 0.8, 0.9, 1);
  }

  createLighting() {
    // Fill light from above/below (the environment map does most of the work)
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.6;
    hemi.diffuse = Color3.White();
    hemi.groundColor = Color3.FromHexString("#444444");

    // Sun. Direction points where the light travels (towards the origin).
    const sun = new DirectionalLight(
      "sun",
      new Vector3(-100, -200, -100).normalize(),
      this.scene
    );
    sun.intensity = 1.5;
  }

  /* ------------------------------ loading ------------------------------ */

  /** Preferred entry point: load a stored asset by id. */
  async loadAsset(id) {
    return this.load(id, () => assetManager.getBuffer(id));
  }

  /** File, Blob, ArrayBuffer or URL string. Pass `key` for stable caching. */
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

      // Parse straight from memory (no blob URL, no second fetch)
      const file = new File([buffer], `${key}.glb`.replace(/[^\w.-]/g, "_"));
      const container = await SceneLoader.LoadAssetContainerAsync(
        "",
        file,
        this.scene,
        null,
        ".glb"
      );

      const root =
        container.meshes.find((m) => m.name === "__root__") ??
        container.meshes[0];

      // glTF often ships single-sided materials with flipped faces: if you
      // still see dark/invisible patches after the lighting fix, enable:
      // container.materials.forEach((m) => (m.backFaceCulling = false));

      const animated = container.animationGroups.length > 0;
      if (!animated) freezeStatic(container);

      const entry = { key, container, root, animated };
      this.models.set(key, entry, 1);

      return entry;
    })().finally(() => this.pending.delete(key));

    this.pending.set(key, task);

    return task;
  }

  show(entry) {
    if (this.current === entry) return entry.root;

    this.detach();

    this.models.pin(entry.key);
    entry.container.addAllToScene();
    this.current = entry;

    entry.container.animationGroups.forEach((group) => group.start(true));

    // Fresh spawn for each model
    physics.setPlayerPosition(new Vector3(0, 0, 5));
    physics.player.velocity.set(0, 0, 0);

    // Colliders are cached per scene root, so switching back is instant
    physics.setWorld(entry.root);

    // VR: teleport targets + respawn for the new model
    this.xrManager?.setFloorMeshes(entry.root.getChildMeshes());
    this.xrManager?.respawn();

    return entry.root;
  }

  /** Remove from the scene but keep cached (no GPU re-upload on return). */
  detach() {
    if (!this.current) return;

    const { container, key } = this.current;

    this.xrManager?.clearFloorMeshes();

    container.animationGroups.forEach((group) => group.stop());
    container.removeAllFromScene();

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
    this.engine.stopRenderLoop(this.animate);
    this.controls?.disable();
  }

  resume() {
    if (!this.initialized) return;
    this.engine.runRenderLoop(this.animate);
    this.controls?.enable();
  }

  animate() {
    // Engine tracks frame time itself, so no manual clock/pause handling
    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.1);

    const inXR = this.xrManager?.isPresenting;
    if (this.controls && !inXR) this.controls.update(delta);
    if (inXR) this.xrManager.applyPhysics();

    this.scene.render();
  }

  onResize() {
    // engine.resize() reads the canvas' real client size and fixes the
    // drawing buffer + camera aspect together
    this.engine?.resize();
  }

  enterVR() {
    return this.xrManager?.enter();
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getEngine() {
    return this.engine;
  }

  getModel() {
    return this.current?.root ?? null;
  }

  dispose() {
    this.controls?.disable();

    window.removeEventListener("resize", this.onResize);
    this.resizeObserver?.disconnect();
    this.engine?.stopRenderLoop();

    this.detach();
    this.models.clear();

    this.xrManager?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.canvas?.remove();

    this.initialized = false;
  }
}

export { SceneManager };
export default SceneManager;