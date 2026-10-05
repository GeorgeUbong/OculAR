import { database } from "./indexDB.js";

const SUPPORTED_TYPES = [
  ".glb",
  ".blend",
];

class AssetManager {
  constructor() {
    this.currentAsset = null;
  }

  validateFile(file) {
    if (!file) {
      throw new Error("No file provided.");
    }

    const extension =
      "." + file.name.split(".").pop().toLowerCase();

    if (!SUPPORTED_TYPES.includes(extension)) {
      throw new Error(
        `Unsupported file type: ${extension}`
      );
    }

    return extension;
  }

  createAsset(file) {
    const extension = this.validateFile(file);

    return {
      id: crypto.randomUUID(),

      name: file.name,

      extension,

      type: file.type || "application/octet-stream",

      size: file.size,

      createdAt: Date.now(),

      file: file,
    };
  }

  async upload(file) {
    const asset = this.createAsset(file);

    await database.saveAsset(asset);

    this.currentAsset = asset;

    return asset;
  }

  async getAsset(id) {
    return await database.getAsset(id);
  }

  async getAllAssets() {
    return await database.getAllAssets();
  }

  async deleteAsset(id) {
    if (
      this.currentAsset &&
      this.currentAsset.id === id
    ) {
      this.currentAsset = null;
    }

    return await database.deleteAsset(id);
  }

  async getCurrentAsset() {
    return this.currentAsset;
  }

  async getAssetURL(asset) {
    if (!asset || !asset.file) {
      throw new Error("Invalid asset.");
    }

    return URL.createObjectURL(asset.file);
  }

  releaseURL(url) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

export const assetManager = new AssetManager();