import {
  WebXRState,
  WebXRFeatureName,
  WebXRSessionManager,
  Vector3,
  Quaternion,
} from "@babylonjs/core";

import { physics } from "../pipeline/physics";

const SPAWN = new Vector3(0, 0, 5);

const DEFAULTS = {
  /**
   * "teleport": point-and-teleport with the thumbstick (most comfortable)
   * "smooth":   thumbstick walking + snap/smooth turning
   */
  locomotion: "teleport",
  movementSpeed: 0.12, // smooth mode only
  rotationSpeed: 0.25, // smooth mode only
  handTracking: false, // optional: Quest-style hand tracking where supported
  /** Only meshes passing this filter can be teleported onto. */
  floorFilter: (mesh) => mesh.isVisible && mesh.getTotalVertices() > 0,
};

/**
 * Handles everything VR-specific so SceneManager stays mostly unchanged:
 *  - detects headset support and shows an "Enter VR" button
 *  - creates the XR experience (controllers, pointer rays, locomotion)
 *  - hands control between desktop UserControls and the headset
 *  - respawns the player when a new model is shown
 */
export class XRManager {
  constructor(sceneManager, options = {}) {
    this.sm = sceneManager;
    this.options = { ...DEFAULTS, ...options };

    this.xr = null;
    this.teleportation = null;
    this.button = null;
    this.supported = false;
    this.disposed = false;
  }

  get isPresenting() {
    return this.xr?.baseExperience?.state === WebXRState.IN_XR;
  }

  /* ------------------------------- setup ------------------------------- */

  async init() {
    this.createButton();

    // WebXR needs a secure context (https or localhost) and a capable browser
    if (!navigator.xr) {
      this.setButtonState("unavailable", "VR not available (needs HTTPS)");
      return;
    }

    try {
      this.supported = await WebXRSessionManager.IsSessionSupportedAsync(
        "immersive-vr"
      );
    } catch {
      this.supported = false;
    }

    if (!this.supported) {
      this.setButtonState("unavailable", "VR headset not detected");
      return;
    }

    try {
      this.xr = await this.sm.scene.createDefaultXRExperienceAsync({
        disableDefaultUI: true, // we render our own button
        disableTeleportation: true, // enabled below with our floor meshes
        disableNearInteraction: true,
      });
    } catch (err) {
      console.warn("Could not create the XR experience:", err);
      this.setButtonState("unavailable", "VR failed to start");
      return;
    }

    if (this.disposed) return;

    this.setupLocomotion();
    this.setupHandTracking();
    this.setupLifecycle();

    this.setButtonState("ready", "Enter VR");
  }

  setupLocomotion() {
    const { featuresManager } = this.xr.baseExperience;
    const { locomotion } = this.options;

    try {
      if (locomotion === "smooth") {
        featuresManager.enableFeature(WebXRFeatureName.MOVEMENT, "latest", {
          xrInput: this.xr.input,
          movementSpeed: this.options.movementSpeed,
          rotationSpeed: this.options.rotationSpeed,
          movementOrientationFollowsViewerPose: true,
        });
        // NOTE: smooth movement bypasses your physics colliders. To keep
        // collisions, read this.xr.baseExperience.camera.position each frame
        // and pass it through your physics step (see applyPhysics below).
      } else {
        this.teleportation = featuresManager.enableFeature(
          WebXRFeatureName.TELEPORTATION,
          "stable",
          {
            xrInput: this.xr.input,
            floorMeshes: [],
            snapPositionsToFloor: true,
            useMainComponentOnly: true,
          }
        );

        // Keep the desktop physics player in sync with where we landed
        this.teleportation.onAfterCameraTeleport.add((pos) => {
          physics.setPlayerPosition(new Vector3(pos.x, 0, pos.z));
        });
      }
    } catch (err) {
      console.warn("Locomotion feature unavailable:", err);
    }
  }

  setupHandTracking() {
    if (!this.options.handTracking) return;

    try {
      this.xr.baseExperience.featuresManager.enableFeature(
        WebXRFeatureName.HAND_TRACKING,
        "latest",
        { xrInput: this.xr.input }
      );
    } catch {
      // Not supported on this device: controllers still work
    }
  }

  setupLifecycle() {
    const { baseExperience } = this.xr;

    baseExperience.onStateChangedObservable.add((state) => {
      if (state === WebXRState.IN_XR) this.onEnter();
      else if (state === WebXRState.NOT_IN_XR) this.onExit();
    });

    // Place the player once the first head pose arrives
    baseExperience.onInitialXRPoseSetObservable.add(() => this.respawn());
  }

  /* --------------------------- enter / exit ---------------------------- */

  async enter() {
    if (!this.xr) return;

    try {
      await this.xr.baseExperience.enterXRAsync(
        "immersive-vr",
        "local-floor",
        this.xr.renderTarget
      );
    } catch (err) {
      console.error("Failed to enter VR:", err);
      this.setButtonState("ready", "Enter VR (retry)");
    }
  }

  async exit() {
    await this.xr?.baseExperience?.exitXRAsync();
  }

  onEnter() {
    // Desktop keyboard/mouse/pointer-lock must not fight the headset
    this.sm.controls?.disable();
    if (this.button) this.button.style.display = "none";
  }

  onExit() {
    this.sm.controls?.enable();
    if (this.button) this.button.style.display = "";
  }

  /* ----------------------------- world sync ---------------------------- */

  /** Called by SceneManager when a model is shown. */
  setFloorMeshes(meshes) {
    if (!this.teleportation) return;

    this.clearFloorMeshes();
    this.floorMeshes = meshes.filter(this.options.floorFilter);
    this.floorMeshes.forEach((m) => this.teleportation.addFloorMesh(m));
  }

  clearFloorMeshes() {
    if (!this.teleportation || !this.floorMeshes) return;

    this.floorMeshes.forEach((m) => this.teleportation.removeFloorMesh(m));
    this.floorMeshes = null;
  }

  /** Put the player back at the spawn point (also used on model change). */
  respawn() {
    if (!this.isPresenting) return;

    const camera = this.xr.baseExperience.camera;
    // local-floor: the headset reports real height, so we only set the XZ
    // spawn and the ground height; do NOT add eye height (1.6) here.
    camera.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    camera.rotationQuaternion = Quaternion.Identity();
  }

  /**
   * Optional: call once per frame in smooth-locomotion mode if your physics
   * can resolve collisions from a proposed position.
   */
  applyPhysics() {
    if (!this.isPresenting || this.options.locomotion !== "smooth") return;

    const p = this.xr.baseExperience.camera.position;
    physics.setPlayerPosition(new Vector3(p.x, 0, p.z));
  }

  /* -------------------------------- UI --------------------------------- */

  createButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Checking VR…";
    button.disabled = true;

    Object.assign(button.style, {
      position: "absolute",
      right: "16px",
      bottom: "16px",
      zIndex: "10",
      padding: "12px 20px",
      border: "1px solid rgba(255,255,255,0.6)",
      borderRadius: "10px",
      background: "rgba(16,16,16,0.75)",
      color: "#fff",
      font: "600 14px system-ui, sans-serif",
      cursor: "pointer",
    });

    button.addEventListener("click", () => this.enter());

    // The container must be a positioned element for the button to anchor
    if (getComputedStyle(this.sm.container).position === "static") {
      this.sm.container.style.position = "relative";
    }

    this.sm.container.appendChild(button);
    this.button = button;
  }

  setButtonState(state, label) {
    if (!this.button) return;

    this.button.textContent = label;
    this.button.disabled = state !== "ready";
    this.button.style.opacity = state === "ready" ? "1" : "0.6";
    this.button.style.cursor = state === "ready" ? "pointer" : "not-allowed";
  }

  /* ------------------------------ teardown ----------------------------- */

  dispose() {
    this.disposed = true;

    this.clearFloorMeshes();
    this.xr?.dispose();
    this.xr = null;
    this.button?.remove();
    this.button = null;
  }
}