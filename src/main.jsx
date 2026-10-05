import { useEffect, useRef, useState } from "react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import "./style.css";

import { assetManager } from "../pipeline/assetsManager.js";
import { SceneManager } from "../pipeline/sceneManager.js";

function App() {
  const viewerRef = useRef(null);
  const sceneManagerRef = useRef(null);

  const [assets, setAssets] = useState([]);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!viewerRef.current) return;

    let sceneManager = null;
    try {
      sceneManager = new SceneManager(viewerRef.current);
      sceneManager.init();
      sceneManagerRef.current = sceneManager;
    } catch (err) {
      console.error("Scene initialization error:", err);
    }

    loadStoredAssets();

    return () => {
      if (sceneManager) {
        sceneManager.dispose();
      }
      sceneManagerRef.current = null;
    };
  }, []);

  async function loadStoredAssets() {
    try {
      const storedAssets =
        await assetManager.getAllAssets();

      setAssets(storedAssets);
    } catch (error) {
      console.error(error);

      setMessage(
        "Could not load stored assets."
      );
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setLoading(true);
      setMessage("Uploading asset...");

      const asset =
        await assetManager.upload(file);

      setAssets((previous) => [
        ...previous,
        asset,
      ]);

      setCurrentAsset(asset);

      if (asset.extension === ".glb") {
        await loadAsset(asset);
      } else {
        setMessage(
          `${asset.name} was stored successfully. BLEND conversion is not implemented yet.`
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Failed to upload asset."
      );
    } finally {
      setLoading(false);

      event.target.value = "";
    }
  }

  async function loadAsset(asset) {
    if (!asset) return;

    if (asset.extension !== ".glb") {
      setMessage(
        "Only GLB files can currently be viewed."
      );

      return;
    }

    try {
      setLoading(true);
      setMessage(
        `Loading ${asset.name}...`
      );

      const sceneManager =
        sceneManagerRef.current;

      if (!sceneManager) {
        throw new Error(
          "Scene manager is not initialized."
        );
      }

      await sceneManager.loadGLB(
        asset.file
      );

      setCurrentAsset(asset);

      setMessage(
        `${asset.name} is ready to explore.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Failed to load 3D scene."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(asset) {
    try {
      await assetManager.deleteAsset(
        asset.id
      );

      setAssets((previous) =>
        previous.filter(
          (item) =>
            item.id !== asset.id
        )
      );

      if (
        currentAsset?.id === asset.id
      ) {
        setCurrentAsset(null);
      }

      setMessage(
        `${asset.name} deleted.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Failed to delete asset."
      );
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">

      {/* =========================
          THREE.JS VIEWER
      ========================== */}

      <section
        ref={viewerRef}
        className="absolute inset-0 h-full w-full"
      />

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside
        className="
          absolute
          left-5
          top-5
          z-10
          flex
          max-h-[calc(100vh-40px)]
          w-[320px]
          flex-col
          overflow-y-auto
          rounded-2xl
          border
          border-white/10
          bg-black/80
          p-5
          text-white
          shadow-2xl
          backdrop-blur-xl
        "
      >

        {/* Header */}

        <div className="mb-5">
          <h1 className="text-xl font-semibold">
            3D Pipeline
          </h1>

          <p className="mt-2 text-sm leading-5 text-white/50">
            Upload a 3D scene and explore
            it in realtime on the web or
            in VR.
          </p>
        </div>

        {/* Upload */}

        <label
          htmlFor="asset-upload"
          className={`
            flex
            w-full
            cursor-pointer
            items-center
            justify-center
            rounded-lg
            px-4
            py-3
            text-sm
            font-medium
            transition
            ${
              loading
                ? "cursor-not-allowed bg-white/20 text-white/40"
                : "bg-white text-black hover:bg-white/90"
            }
          `}
        >
          {loading
            ? "Processing..."
            : "Upload 3D File"}
        </label>

        <input
          id="asset-upload"
          type="file"
          accept=".glb,.blend"
          onChange={handleUpload}
          disabled={loading}
          className="hidden"
        />

        {/* Status */}

        {message && (
          <div
            className="
              mt-3
              rounded-lg
              border
              border-white/5
              bg-white/5
              px-3
              py-2.5
              text-xs
              leading-5
              text-white/60
            "
          >
            {message}
          </div>
        )}

        {/* Current Asset */}

        {currentAsset && (
          <div
            className="
              mt-4
              rounded-lg
              border
              border-white/5
              bg-white/5
              p-3
            "
          >
            <span className="block text-[11px] text-white/40">
              Currently viewing
            </span>

            <strong
              className="
                mt-1
                block
                truncate
                text-sm
                font-medium
              "
            >
              {currentAsset.name}
            </strong>
          </div>
        )}

        {/* Assets */}

        <div className="mt-6">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Your Scenes
            </h2>

            <span
              className="
                rounded-full
                bg-white/10
                px-2
                py-0.5
                text-[10px]
                text-white/50
              "
            >
              {assets.length}
            </span>
          </div>

          {assets.length === 0 ? (
            <p className="text-xs text-white/30">
              No scenes uploaded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">

              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="
                    rounded-lg
                    border
                    border-white/5
                    bg-white/[0.03]
                    p-3
                    transition
                    hover:bg-white/[0.06]
                  "
                >

                  {/* Asset information */}

                  <div className="min-w-0">

                    <strong
                      className="
                        block
                        truncate
                        text-xs
                        font-medium
                        text-white
                      "
                    >
                      {asset.name}
                    </strong>

                    <span className="mt-1 block text-[10px] text-white/30">
                      {formatFileSize(
                        asset.size
                      )}
                    </span>

                  </div>

                  {/* Actions */}

                  <div className="mt-3 flex gap-2">

                    <button
                      onClick={() =>
                        loadAsset(asset)
                      }
                      disabled={
                        loading ||
                        asset.extension !==
                          ".glb"
                      }
                      className="
                        flex-1
                        rounded-md
                        bg-white/10
                        px-2
                        py-1.5
                        text-[11px]
                        font-medium
                        text-white
                        transition
                        hover:bg-white/20
                        disabled:cursor-not-allowed
                        disabled:opacity-30
                      "
                    >
                      Explore
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(asset)
                      }
                      className="
                        rounded-md
                        bg-white/5
                        px-3
                        py-1.5
                        text-[11px]
                        text-white/40
                        transition
                        hover:bg-red-500/10
                        hover:text-red-400
                      "
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* Controls */}

        <div
          className="
            mt-6
            border-t
            border-white/10
            pt-5
          "
        >

          <h2 className="text-sm font-medium">
            Controls
          </h2>

          <div className="mt-3 space-y-2.5">

            <ControlItem>
              <Key>W</Key>
              <Key>A</Key>
              <Key>S</Key>
              <Key>D</Key>
              <span>Move</span>
            </ControlItem>

            <ControlItem>
              <Key>Mouse</Key>
              <span>Look around</span>
            </ControlItem>

            <ControlItem>
              <Key>Space</Key>
              <span>Jump</span>
            </ControlItem>

          </div>

          <p className="mt-4 text-[11px] leading-4 text-white/30">
            Click inside the scene to
            capture the mouse. Use the VR
            button to enter immersive mode
            when a compatible headset is
            connected.
          </p>

        </div>

      </aside>

    </main>
  );
}


/*
 * Small control row
 */

function ControlItem({ children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-white/40">
      {children}
    </div>
  );
}


/*
 * Keyboard key
 */

function Key({ children }) {
  return (
    <kbd
      className="
        inline-flex
        min-h-5
        items-center
        justify-center
        rounded
        border
        border-white/10
        bg-white/5
        px-1.5
        text-[9px]
        font-medium
        text-white/60
      "
    >
      {children}
    </kbd>
  );
}


/*
 * Convert bytes to readable size
 */

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0 || isNaN(bytes)) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024)))
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

export default App;

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);