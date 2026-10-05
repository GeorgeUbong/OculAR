import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class UserControls {
  constructor(camera, domElement, physics) {
    this.camera = camera;
    this.domElement = domElement;
    this.physics = physics;

    // -------------------------
    // Keyboard
    // -------------------------

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    this.speed = 4;

    // -------------------------
    // Movement
    // -------------------------

    this.direction = new THREE.Vector3();

    this.yaw = 0;

    // -------------------------
    // Orbit Controls
    // -------------------------

    this.orbit = new OrbitControls(
      this.camera,
      this.domElement
    );

    this.orbit.enableDamping = true;

    this.orbit.dampingFactor = 0.08;

    // Disable panning.
    // WASD handles movement instead.
    this.orbit.enablePan = false;

    // Optional zoom.
    this.orbit.enableZoom = true;

    // Don't allow the camera to flip upside down.
    this.orbit.maxPolarAngle =
      Math.PI * 0.95;

    this.orbit.minPolarAngle =
      0.1;

    // Keep the camera reasonably close
    // to the player.
    this.orbit.minDistance = 0.5;

    this.orbit.maxDistance = 10;

    // -------------------------
    // State
    // -------------------------

    this.enabled = false;

    // Bind events
    this.onKeyDown =
      this.onKeyDown.bind(this);

    this.onKeyUp =
      this.onKeyUp.bind(this);
  }

  // =====================================================
  // ENABLE
  // =====================================================

  enable() {
    if (this.enabled) return;

    this.enabled = true;

    window.addEventListener(
      "keydown",
      this.onKeyDown
    );

    window.addEventListener(
      "keyup",
      this.onKeyUp
    );

    this.orbit.enabled = true;
  }

  // =====================================================
  // DISABLE
  // =====================================================

  disable() {
    this.enabled = false;

    window.removeEventListener(
      "keydown",
      this.onKeyDown
    );

    window.removeEventListener(
      "keyup",
      this.onKeyUp
    );

    this.orbit.enabled = false;
  }

  // =====================================================
  // KEY DOWN
  // =====================================================

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW":
        this.keys.forward = true;
        break;

      case "KeyS":
        this.keys.backward = true;
        break;

      case "KeyA":
        this.keys.left = true;
        break;

      case "KeyD":
        this.keys.right = true;
        break;

      case "Space":
        this.physics.jump();
        break;
    }
  }

  // =====================================================
  // KEY UP
  // =====================================================

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.keys.forward = false;
        break;

      case "KeyS":
        this.keys.backward = false;
        break;

      case "KeyA":
        this.keys.left = false;
        break;

      case "KeyD":
        this.keys.right = false;
        break;
    }
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update(deltaTime) {
    if (!this.enabled) return;

    // -----------------------------------
    // WASD movement
    // -----------------------------------

    this.direction.set(0, 0, 0);

    if (this.keys.forward) {
      this.direction.z -= 1;
    }

    if (this.keys.backward) {
      this.direction.z += 1;
    }

    if (this.keys.left) {
      this.direction.x -= 1;
    }

    if (this.keys.right) {
      this.direction.x += 1;
    }

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();

      /*
       * Get the horizontal direction
       * from the orbit camera.
       *
       * This means:
       *
       * Mouse rotates camera
       *        ↓
       * WASD follows camera direction
       */

      const forward =
        new THREE.Vector3();

      this.camera.getWorldDirection(
        forward
      );

      // Keep movement horizontal.
      forward.y = 0;

      forward.normalize();

      // Right vector
      const right =
        new THREE.Vector3();

      right.crossVectors(
        forward,
        new THREE.Vector3(0, 1, 0)
      );

      right.normalize();

      const movement =
        new THREE.Vector3();

      // Forward / backward
      movement.addScaledVector(
        forward,
        -this.direction.z
      );

      // Left / right
      movement.addScaledVector(
        right,
        this.direction.x
      );

      movement.normalize();

      movement.multiplyScalar(
        this.speed * deltaTime
      );

      // Send movement to physics
      this.physics.move(movement);
    }

    // -----------------------------------
    // Physics
    // -----------------------------------

    this.physics.update(deltaTime);

    // -----------------------------------
    // Player position
    // -----------------------------------

    const position =
      this.physics.getPlayerPosition();

    /*
     * Keep the OrbitControls target
     * attached to the player's head.
     */

    this.orbit.target.set(
      position.x,
      position.y + 1.6,
      position.z
    );

    /*
     * Move the camera along with
     * the player while preserving
     * its orbit offset.
     */

    const cameraOffset =
      this.camera.position
        .clone()
        .sub(this.orbit.target);

    this.camera.position.copy(
      new THREE.Vector3(
        position.x,
        position.y + 1.6,
        position.z
      ).add(cameraOffset)
    );

    // Update orbit controls
    this.orbit.update();
  }

  // =====================================================
  // SPEED
  // =====================================================

  setSpeed(speed) {
    this.speed = speed;
  }

  // =====================================================
  // RESET CAMERA
  // =====================================================

  resetRotation() {
    const position =
      this.physics.getPlayerPosition();

    this.orbit.target.set(
      position.x,
      position.y + 1.6,
      position.z
    );

    this.camera.position.set(
      position.x,
      position.y + 1.6,
      position.z + 5
    );

    this.orbit.update();
  }

  // =====================================================
  // SET ORBIT DISTANCE
  // =====================================================

  setDistance(distance) {
    this.orbit.minDistance =
      distance;

    this.orbit.maxDistance =
      distance;
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    this.disable();

    this.orbit.dispose();
  }
}

export default UserControls;