import * as THREE from "three";

const CELL = 4; // broadphase grid cell size (world units, XZ plane)
const MAX_CELLS_PER_BOX = 64; // bigger boxes go in a "always check" list
const MIN_COLLIDER_SIZE = 0.05; // ignore tiny props

// _hit modes
const HORIZONTAL = 0; // ignore anything we can step onto
const LANDING = 1; // boxes whose top is at/below our feet
const CEILING = 2; // boxes whose bottom is at/above our head

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
    this.stepHeight = 0.35;
    this.grounded = false;

    // Active collider set
    this.colliders = [];
    this.grid = new Map();
    this.big = [];

    // Built colliders per scene, so re-showing a cached model is instant
    this.worldCache = new Map();

    // Scratch objects (no allocations in the frame loop)
    this._box = new THREE.Box3();
    this._seen = new Set();
  }

  /* ---------------------------- world setup ---------------------------- */

  setWorld(scene) {
    this.world = scene;

    let data = this.worldCache.get(scene.uuid);

    if (!data) {
      data = this.buildColliders(scene);
      this.worldCache.set(scene.uuid, data);
    }

    this.colliders = data.colliders;
    this.grid = data.grid;
    this.big = data.big;
  }

  /** Call when a model is evicted from memory. */
  releaseWorld(scene) {
    this.worldCache.delete(scene.uuid);

    if (this.world === scene) {
      this.world = null;
      this.clearColliders();
    }
  }

  buildColliders(scene) {
    const data = { colliders: [], grid: new Map(), big: [] };

    scene.updateMatrixWorld(true);

    scene.traverse((object) => {
      if (!object.isMesh) return;

      const box = new THREE.Box3().setFromObject(object);

      if (box.isEmpty()) return;

      if (
        box.max.x - box.min.x < MIN_COLLIDER_SIZE &&
        box.max.y - box.min.y < MIN_COLLIDER_SIZE &&
        box.max.z - box.min.z < MIN_COLLIDER_SIZE
      ) {
        return;
      }

      this.insert(data, box);
    });

    return data;
  }

  insert(data, box) {
    const index = data.colliders.length;
    data.colliders.push(box);

    const x0 = Math.floor(box.min.x / CELL);
    const x1 = Math.floor(box.max.x / CELL);
    const z0 = Math.floor(box.min.z / CELL);
    const z1 = Math.floor(box.max.z / CELL);

    if ((x1 - x0 + 1) * (z1 - z0 + 1) > MAX_CELLS_PER_BOX) {
      data.big.push(index);
      return;
    }

    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const key = this.cellKey(x, z);
        let list = data.grid.get(key);

        if (!list) {
          list = [];
          data.grid.set(key, list);
        }

        list.push(index);
      }
    }
  }

  cellKey(x, z) {
    return x * 73856093 + z * 19349663;
  }

  addCollider(object) {
    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(object);

    this.insert(
      { colliders: this.colliders, grid: this.grid, big: this.big },
      box
    );
  }

  clearColliders() {
    this.colliders = [];
    this.grid = new Map();
    this.big = [];
  }

  /* ------------------------------ queries ------------------------------ */

  /**
   * Returns the first collider box overlapping the player capsule-box at
   * (px, py, pz), filtered by mode. `ref` is the reference Y for the mode.
   */
  _hit(px, py, pz, mode, ref) {
    const r = this.player.radius;
    const box = this._box;

    box.min.set(px - r, py, pz - r);
    box.max.set(px + r, py + this.player.height, pz + r);

    const seen = this._seen;
    seen.clear();

    const test = (index) => {
      if (seen.has(index)) return null;
      seen.add(index);

      const c = this.colliders[index];

      if (mode === HORIZONTAL && c.max.y <= ref) return null;
      if (mode === LANDING && c.max.y > ref) return null;
      if (mode === CEILING && c.min.y < ref) return null;

      return box.intersectsBox(c) ? c : null;
    };

    for (let i = 0; i < this.big.length; i++) {
      const hit = test(this.big[i]);
      if (hit) return hit;
    }

    const x0 = Math.floor(box.min.x / CELL);
    const x1 = Math.floor(box.max.x / CELL);
    const z0 = Math.floor(box.min.z / CELL);
    const z1 = Math.floor(box.max.z / CELL);

    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const list = this.grid.get(this.cellKey(x, z));
        if (!list) continue;

        for (let i = 0; i < list.length; i++) {
          const hit = test(list[i]);
          if (hit) return hit;
        }
      }
    }

    return null;
  }

  checkCollision(position) {
    return (
      this._hit(
        position.x,
        position.y,
        position.z,
        HORIZONTAL,
        position.y + this.stepHeight
      ) !== null
    );
  }

  /* ----------------------------- movement ------------------------------ */

  setPlayerPosition(position) {
    this.player.position.copy(position);
  }

  /** Pass a target vector to avoid allocating. */
  getPlayerPosition(target) {
    return (target || new THREE.Vector3()).copy(this.player.position);
  }

  move(delta) {
    this.moveBy(delta.x, delta.y, delta.z);
  }

  moveBy(dx, dy, dz) {
    const p = this.player.position;
    const stepY = p.y + this.stepHeight;

    // Axis-separated horizontal movement (allows sliding along walls)
    if (dx !== 0 && !this._hit(p.x + dx, p.y, p.z, HORIZONTAL, stepY)) {
      p.x += dx;
    }

    if (dz !== 0 && !this._hit(p.x, p.y, p.z + dz, HORIZONTAL, stepY)) {
      p.z += dz;
    }

    // Vertical
    if (dy !== 0) {
      const oldY = p.y;
      const newY = oldY + dy;

      if (dy < 0) {
        const floor = this._hit(
          p.x,
          newY,
          p.z,
          LANDING,
          oldY + this.stepHeight
        );

        if (floor) {
          p.y = floor.max.y;
          this.player.velocity.y = 0;
          this.grounded = true;
        } else {
          p.y = newY;
          this.grounded = false;
        }
      } else {
        const ceiling = this._hit(
          p.x,
          newY,
          p.z,
          CEILING,
          oldY + this.player.height - 0.01
        );

        if (ceiling) {
          p.y = ceiling.min.y - this.player.height;
          this.player.velocity.y = Math.min(this.player.velocity.y, 0);
        } else {
          p.y = newY;
        }

        this.grounded = false;
      }
    }

    // Fallback floor plane
    if (p.y <= this.groundHeight) {
      p.y = this.groundHeight;
      this.player.velocity.y = 0;
      this.grounded = true;
    }
  }

  update(deltaTime) {
    // Clamp so a hitch can't tunnel the player through geometry
    const dt = Math.min(deltaTime, 0.05);

    this.player.velocity.y += this.gravity * dt;
    this.moveBy(0, this.player.velocity.y * dt, 0);
  }

  jump(force = 5) {
    if (this.grounded || this.player.position.y <= this.groundHeight + 0.01) {
      this.player.velocity.y = force;
      this.grounded = false;
    }
  }
}

export const physics = new Physics();