import * as THREE from "three";

class Physics {
  constructor() {
    this.world = null;

    this.player = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),

      radius: 0.35,
      height: 1.8,
    };

    this.gravity = -9.8;

    this.groundHeight = 0;

    this.colliders = [];
  }

  setWorld(scene) {
    this.world = scene;
    this.generateColliders(scene);
  }

  generateColliders(scene) {
    this.colliders = [];

    scene.traverse((object) => {
      if (!object.isMesh) return;

      const box = new THREE.Box3().setFromObject(
        object
      );

      if (!box.isEmpty()) {
        this.colliders.push(box);
      }
    });
  }

  setPlayerPosition(position) {
    this.player.position.copy(position);
  }

  getPlayerPosition() {
    return this.player.position.clone();
  }

  checkCollision(position) {
    const playerBox = new THREE.Box3();

    const min = new THREE.Vector3(
      position.x - this.player.radius,
      position.y,
      position.z - this.player.radius
    );

    const max = new THREE.Vector3(
      position.x + this.player.radius,
      position.y + this.player.height,
      position.z + this.player.radius
    );

    playerBox.set(min, max);

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider)) {
        return true;
      }
    }

    return false;
  }

  move(delta) {
    const nextPosition =
      this.player.position.clone().add(delta);

    // X movement
    const xPosition = this.player.position.clone();

    xPosition.x = nextPosition.x;

    if (!this.checkCollision(xPosition)) {
      this.player.position.x = nextPosition.x;
    }

    // Z movement
    const zPosition = this.player.position.clone();

    zPosition.z = nextPosition.z;

    if (!this.checkCollision(zPosition)) {
      this.player.position.z = nextPosition.z;
    }

    // Vertical movement
    this.player.position.y += delta.y;

    if (this.player.position.y < this.groundHeight) {
      this.player.position.y =
        this.groundHeight;

      this.player.velocity.y = 0;
    }
  }

  update(deltaTime) {
    this.player.velocity.y +=
      this.gravity * deltaTime;

    const verticalMovement =
      this.player.velocity.y * deltaTime;

    this.move(
      new THREE.Vector3(
        0,
        verticalMovement,
        0
      )
    );
  }

  jump(force = 5) {
    if (
      this.player.position.y <=
      this.groundHeight + 0.01
    ) {
      this.player.velocity.y = force;
    }
  }

  addCollider(object) {
    const box = new THREE.Box3().setFromObject(
      object
    );

    this.colliders.push(box);
  }

  clearColliders() {
    this.colliders = [];
  }
}

export const physics = new Physics();