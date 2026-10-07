import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import LoadingPage from "../components/Loading.jsx";
import { assetManager } from "../../pipeline/assetsManager.js";
import { SceneManager } from "../../pipeline/sceneManager.js";

export default function AssetView() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [assets, setAssets] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [error, setError] = useState("");
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const urlsRef = useRef([]);

  function getScene() {
    if (!sceneRef.current) {
      const stage = document.createElement("div");
      stage.style.cssText = "position:absolute;inset:0;";
      stageRef.current = stage;
      sceneRef.current = new SceneManager(stage);
    }
    return sceneRef.current;
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([assetManager.getAsset(assetId), assetManager.getAllAssets()])
      .then(([selected, allAssets]) => {
        if (cancelled) return;
        if (!selected) throw new Error("Environment not found.");
        setAsset(selected);
        setAssets(allAssets.sort((a, b) => b.createdAt - a.createdAt));
        const nextThumbs = {};
        for (const item of allAssets) {
          if (!item.thumbnail) continue;
          const url = URL.createObjectURL(item.thumbnail);
          urlsRef.current.push(url);
          nextThumbs[item.id] = url;
        }
        setThumbs(nextThumbs);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load this environment.");
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      urlsRef.current.forEach(URL.revokeObjectURL);
      urlsRef.current = [];
    };
  }, [assetId]);

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-black p-6 font-gsans text-white">
      <div className="text-center"><p>{error}</p><button className="mt-4 rounded-lg bg-white/10 px-4 py-2" onClick={() => navigate("/projects")}>Back to environments</button></div>
    </div>;
  }
  if (!asset) return <LoadingPage message="Loading environment..." />;

  return <SceneViewer asset={asset} assets={assets} thumbs={thumbs} getScene={getScene} stageRef={stageRef} onSelect={(item) => navigate(`/projects/${item.id}`)} onClose={() => navigate("/projects")} />;
}

function SceneViewer({ asset, assets, thumbs, getScene, stageRef, onSelect, onClose }) {
  const mountRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const scene = getScene();
    const stage = stageRef.current;
    mountRef.current.appendChild(stage);
    if (!scene.initialized) scene.init();
    else { scene.resume(); scene.onResize(); }
    const onKey = (event) => { if (event.key === "Escape" && !document.pointerLockElement) onClose(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.exitPointerLock?.();
      scene.pause();
      stage.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading"); setError("");
    getScene().loadAsset(asset.id).then((result) => {
      if (!cancelled && result) setStatus("ready");
    }).catch((err) => {
      if (!cancelled) { setError(err.message || "Failed to load 3D scene."); setStatus("error"); }
    });
    return () => { cancelled = true; };
  }, [asset.id]);

  return <div className="fixed inset-0 z-50 bg-black">
    <section ref={mountRef} className="absolute inset-0 h-full w-full" />
    {status === "loading" && <LoadingPage message={`Loading ${asset.name}...`} />}
    {status === "error" && <div role="alert" className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 font-gsans text-white"><p>{error}</p></div>}
    <aside className="absolute left-5 top-5 z-20 flex max-h-[calc(100vh-40px)] w-[320px] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/80 p-5 text-white shadow-2xl backdrop-blur-xl">
      <button type="button" onClick={onClose} className="mb-5 flex items-center gap-2 self-start rounded-lg bg-white/10 px-3 py-2 font-gsans text-xs font-medium transition-all hover:bg-white/20"><FontAwesomeIcon icon={faArrowLeft} />Back to environments</button>
      <h1 className="font-playpen text-xl font-bold">OculAR</h1>
      <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3"><span className="block text-[11px] text-white/40">Currently viewing</span><strong className="mt-1 block truncate text-sm font-medium">{asset.name}</strong></div>
      {assets.length > 1 && <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">Your Scenes</h2><span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">{assets.length}</span></div><div className="flex flex-col gap-2">
        {assets.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)} onMouseEnter={() => assetManager.prefetch(item.id)} aria-current={item.id === asset.id} className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-all hover:scale-[1.02] ${item.id === asset.id ? "border-white/30 bg-white/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
          {thumbs[item.id] ? <img src={thumbs[item.id]} alt="" className="h-10 w-14 flex-none rounded object-cover" /> : <div className="h-10 w-14 flex-none rounded bg-white/10" />}
          <span className="min-w-0"><strong className="block truncate text-xs font-medium">{item.name}</strong><span className="block text-[10px] text-white/30">{formatFileSize(item.size)}</span></span>
        </button>)}
      </div></div>}
      <div className="mt-6 border-t border-white/10 pt-5"><h2 className="text-sm font-medium">Controls</h2><div className="mt-3 space-y-2.5"><ControlItem><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key><span>Move</span></ControlItem><ControlItem><Key>Mouse</Key><span>Look around</span></ControlItem><ControlItem><Key>Space</Key><span>Jump</span></ControlItem><ControlItem><Key>Esc</Key><span>Release mouse / leave</span></ControlItem></div><p className="mt-4 text-[11px] leading-4 text-white/30">Click inside the scene to capture the mouse. Use the VR button to enter immersive mode when a compatible headset is connected.</p></div>
    </aside>
  </div>;
}

function ControlItem({ children }) { return <div className="flex items-center gap-1.5 text-xs text-white/40">{children}</div>; }
function Key({ children }) { return <kbd className="inline-flex min-h-5 items-center justify-center rounded border border-white/10 bg-white/5 px-1.5 text-[9px] font-medium text-white/60">{children}</kbd>; }
function formatFileSize(bytes) {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))));
  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}
