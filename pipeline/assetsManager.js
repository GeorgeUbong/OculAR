import { database } from "./indexDB.js";
import { MemoryBuffer } from "./Buffer.js";
import { generateThumbnail } from "./ThumbNail.js";

// GLTFLoader can only read glTF/GLB. .blend files would need converting first.
const SUPPORTED_TYPES = [".glb", ".gltf"];

const GLB_MAGIC = 0x46546c67; // "glTF" (little endian)

const BUFFER_CACHE_BYTES = 256 * 1024 * 1024;

class AssetManager {
  constructor() {
    this.currentAsset = null;

    // Raw GLB bytes held in RAM so re-loading never touches IndexedDB
    this.buffers = new MemoryBuffer({ maxSize: BUFFER_CACHE_BYTES });

    // De-duplicates simultaneous reads of the same asset
    this.pending = new Map();
  }

  validateFile(file) {
    if (!file) {
      throw new Error("No file provided.");
    }

    const extension = "." + file.name.split(".").pop().toLowerCase();

    if (!SUPPORTED_TYPES.includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}`);
    }

    return extension;
  }

  validateBuffer(buffer, extension) {
    if (extension === ".glb") {
      if (
        buffer.byteLength < 12 ||
        new DataView(buffer).getUint32(0, true) !== GLB_MAGIC
      ) {
        throw new Error("File is not a valid GLB.");
      }
      return;
    }

    try {
      const gltf = JSON.parse(new TextDecoder().decode(buffer));
      if (!gltf.asset?.version) throw new Error();
    } catch {
      throw new Error("File is not a valid glTF scene.");
    }
  }

  async inlineGLTFResources(buffer, files) {
    const gltf = JSON.parse(new TextDecoder().decode(buffer));
    const resources = [...(gltf.buffers || []), ...(gltf.images || [])];

    for (const resource of resources) {
      if (!resource.uri || resource.uri.startsWith("data:")) continue;

      const resourcePath = decodeURIComponent(resource.uri.split(/[?#]/)[0]).replace(/\\/g, "/");
      const fileName = resourcePath.split("/").pop();
      const file = files.find((candidate) => {
        const candidatePath = (candidate.webkitRelativePath || candidate.name).replace(/\\/g, "/");
        return candidatePath === resourcePath || candidate.name === fileName;
      });

      if (!file) {
        throw new Error(`Select the referenced file "${fileName}" with your .gltf scene.`);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }

      const extension = file.name.split(".").pop().toLowerCase();
      const mimeType = file.type || ({
        bin: "application/octet-stream",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        avif: "image/avif",
      })[extension] || "application/octet-stream";
      resource.uri = `data:${mimeType};base64,${btoa(binary)}`;
    }

    return new TextEncoder().encode(JSON.stringify(gltf)).buffer;
  }

  async upload(file, relatedFiles = [file]) {
    const extension = this.validateFile(file);

    // Embed glTF sidecar files so the stored scene remains self-contained.
    const sourceBuffer = await file.arrayBuffer();
    const buffer = extension === ".gltf"
      ? await this.inlineGLTFResources(sourceBuffer, relatedFiles)
      : sourceBuffer;
    this.validateBuffer(buffer, extension);

    const asset = {
      id: crypto.randomUUID(),
      name: file.name,
      extension,
      type: file.type || (extension === ".gltf" ? "model/gltf+json" : "model/gltf-binary"),
      size: buffer.byteLength,
      createdAt: Date.now(),
    };

    try {
      asset.thumbnail = await generateThumbnail(buffer);
    } catch (error) {
      console.warn("Thumbnail generation failed:", error);
    }

    await database.saveAsset(asset, buffer);

    this.buffers.set(asset.id, buffer, buffer.byteLength);
    this.currentAsset = asset;

    return asset;
  }

  /** Memory first, then IndexedDB. */
  async getBuffer(id) {
    const cached = this.buffers.get(id);
    if (cached) return cached;

    if (this.pending.has(id)) return this.pending.get(id);

    const task = this.readFromDatabase(id).finally(() =>
      this.pending.delete(id)
    );

    this.pending.set(id, task);

    return task;
  }

  async readFromDatabase(id) {
    let buffer = await database.getBuffer(id);

    // Migrate records saved by the old version (File stored on the record)
    if (!buffer) {
      const legacy = await database.getAsset(id);

      if (legacy?.file) {
        buffer = await legacy.file.arrayBuffer();

        const { file, ...meta } = legacy;
        await database.saveAsset(meta, buffer);
      }
    }

    if (!buffer) throw new Error(`Asset not found: ${id}`);

    this.buffers.set(id, buffer, buffer.byteLength);

    return buffer;
  }

  /** Returns the stored thumbnail Blob, generating it for older assets. */
  async ensureThumbnail(asset) {
    if (asset.thumbnail) return asset.thumbnail;

    // Read bytes without evicting anything useful from the RAM cache
    const buffer =
      this.buffers.get(asset.id) || (await database.getBuffer(asset.id));
    if (!buffer) return null;

    const thumbnail = await generateThumbnail(buffer);
    if (!thumbnail) return null;

    asset.thumbnail = thumbnail;
    const { file, ...meta } = asset;
    await database.saveAsset(meta);

    return thumbnail;
  }

  /** Warm the cache ahead of time (e.g. on hover in the UI). */
  prefetch(id) {
    return this.getBuffer(id).catch(() => {});
  }

  async getAsset(id) {
    return await database.getAsset(id);
  }

  async getAllAssets() {
    return await database.getAllAssets();
  }

  async deleteAsset(id) {
    if (this.currentAsset && this.currentAsset.id === id) {
      this.currentAsset = null;
    }

    this.buffers.delete(id);

    return await database.deleteAsset(id);
  }

  async getCurrentAsset() {
    return this.currentAsset;
  }

  /** Kept for compatibility; prefer SceneManager.loadAsset(id). */
  async getAssetURL(asset) {
    if (!asset?.id) throw new Error("Invalid asset.");

    const buffer = await this.getBuffer(asset.id);

    return URL.createObjectURL(
      new Blob([buffer], { type: "model/gltf-binary" })
    );
  }

  releaseURL(url) {
    if (url) URL.revokeObjectURL(url);
  }
}

export const assetManager = new AssetManager();