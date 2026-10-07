const WIDTH = 640;
const HEIGHT = 440;

let THREE;
let loader;
let disposeGLTF;
let renderer = null;
let queue = Promise.resolve();

async function loadRendererDependencies() {
  if (loader) return;

  const [threeModule, loaderModule, utilsModule] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("./Gltfutils.js"),
  ]);

  THREE = threeModule;
  loader = new loaderModule.GLTFLoader();
  disposeGLTF = utilsModule.disposeGLTF;
}

// One shared renderer: browsers cap the number of live WebGL contexts.
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(WIDTH, HEIGHT, false);
  }
  return renderer;
}

async function render(buffer) {
  await loadRendererDependencies();
  const gltf = await loader.parseAsync(buffer, "");

  try {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    if (box.isEmpty()) return null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151515);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(10, 20, 10);
    scene.add(sun);
    scene.add(gltf.scene);

    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.001);

    const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, radius / 100, radius * 100);
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.05;

    camera.position
      .copy(center)
      .add(new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(distance));
    camera.lookAt(center);

    const r = getRenderer();
    r.render(scene, camera);

    return await new Promise((resolve) =>
      r.domElement.toBlob(resolve, "image/jpeg", 0.82)
    );
  } finally {
    disposeGLTF(gltf);
  }
}

/** Renders a GLB ArrayBuffer to a JPEG Blob. Jobs run one at a time. */
export function generateThumbnail(buffer) {
  const job = queue.then(() => render(buffer));
  queue = job.catch(() => {});
  return job;
}
