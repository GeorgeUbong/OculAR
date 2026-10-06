/** Release GPU resources owned by a parsed glTF model. */
export function disposeGLTF(gltf) {
  if (!gltf?.scene) return;

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  gltf.scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);

    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    for (const material of objectMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
