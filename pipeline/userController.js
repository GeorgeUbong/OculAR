import { Vector3 } from "@babylonjs/core";

const EYE_HEIGHT = 1.6;
const LOOK_SENSITIVITY = 0.002;
const MAX_PITCH = Math.PI / 2 - 0.01;

class UserControls {
  constructor(camera, domElement, physics) {
    this.camera = camera;
    this.domElement = domElement;
    this.physics = physics;
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.speed = 4;
    this.enabled = false;
    this.yaw = camera.rotation.y;
    this.pitch = camera.rotation.x;
    this.direction = new Vector3();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.domElement.addEventListener("click", this.onClick);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.domElement.removeEventListener("click", this.onClick);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    if (document.pointerLockElement === this.domElement) document.exitPointerLock();
    this.clearKeys();
  }

  clearKeys() {
    this.keys.forward = this.keys.backward = this.keys.left = this.keys.right = false;
  }

  onClick() {
    if (this.enabled && document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock?.();
    }
  }

  onPointerLockChange() {
    if (document.pointerLockElement !== this.domElement) this.clearKeys();
  }

  onMouseMove(event) {
    if (!this.enabled || document.pointerLockElement !== this.domElement) return;
    this.yaw += event.movementX * LOOK_SENSITIVITY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + event.movementY * LOOK_SENSITIVITY));
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
  }

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW": this.keys.forward = true; break;
      case "KeyS": this.keys.backward = true; break;
      case "KeyA": this.keys.left = true; break;
      case "KeyD": this.keys.right = true; break;
      case "Space": this.physics.jump(); break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW": this.keys.forward = false; break;
      case "KeyS": this.keys.backward = false; break;
      case "KeyA": this.keys.left = false; break;
      case "KeyD": this.keys.right = false; break;
    }
  }

  update(deltaTime) {
    if (!this.enabled) return;
    this.direction.set(
      Number(this.keys.right) - Number(this.keys.left),
      0,
      Number(this.keys.backward) - Number(this.keys.forward)
    );
    if (this.direction.lengthSquared() > 0) {
      this.direction.normalize();
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = (this.direction.x * cos + this.direction.z * sin) * this.speed * deltaTime;
      const dz = (-this.direction.x * sin + this.direction.z * cos) * this.speed * deltaTime;
      this.physics.moveBy(dx, 0, dz);
    }

    this.physics.update(deltaTime);
    const position = this.physics.getPlayerPosition();
    this.camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
  }

  setSpeed(speed) { this.speed = speed; }

  resetRotation() {
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
    const position = this.physics.getPlayerPosition();
    this.camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);
  }

  setDistance() {}

  dispose() { this.disable(); }
}

export default UserControls;
