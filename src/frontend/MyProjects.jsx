import React, { useEffect, useRef, useState } from "react";
import "../style.css";
import heroImg from "../assets/hero.png";
import FloatingNav from "../components/navBar.jsx";
import Footer from "../components/footer.jsx";
import Modal from "../components/Modal.jsx";
import { faPlus, faArrowLeft, faArrowRight, faCube, faFileUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion,
} from "motion/react";

import { assetManager } from "../../pipeline/assetsManager.js";
import { SceneManager } from "../../pipeline/SceneManager.js";

const UPLOAD_INPUT_ID = "asset-upload";
const MAX_ASSETS = 3;
const UPLOAD_LIMIT_MESSAGE = "Cannot upload more than 3 assets at a time. Please delete one to add another asset.";

const pillButton =
    "inline-flex cursor-pointer items-center rounded-full bg-brand-secondary px-8 py-4 text-lg font-medium text-on-accent font-gsans shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:brightness-95 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105";

/* ---------- scroll-reveal helpers (same as the home page) ---------- */

const reveal = {
    initial: "hidden",
    whileInView: "show",
    viewport: { once: true, amount: 0.25 },
};

function useRevealVariants() {
    const reduce = useReducedMotion();
    const offset = reduce ? 0 : 28;

    return {
        stagger: {
            hidden: {},
            show: { transition: { staggerChildren: reduce ? 0 : 0.12 } },
        },
        item: {
            hidden: { opacity: 0, y: offset },
            show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            },
        },
    };
}

/* ====================================================================
   PAGE
==================================================================== */

export default function ViewerPage() {
    const [assets, setAssets] = useState([]);
    const [ready, setReady] = useState(false);
    const [active, setActive] = useState(null); // asset open in the viewer
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [modalMessage, setModalMessage] = useState("");
    const [pendingDelete, setPendingDelete] = useState(null);
    const [thumbs, setThumbs] = useState({}); // id -> object URL

    // One SceneManager for the whole page. It lives in a detached "stage"
    // element that is moved into the viewer overlay whenever it opens, so
    // the model cache and GPU resources survive closing and reopening.
    const sceneRef = useRef(null);
    const stageRef = useRef(null);

    const urlsRef = useRef(new Map());
    const attemptedRef = useRef(new Set());
    const mountedRef = useRef(true);

    function getScene() {
        if (!sceneRef.current) {
            const stage = document.createElement("div");
            stage.style.cssText = "position:absolute;inset:0;";
            stageRef.current = stage;
            sceneRef.current = new SceneManager(stage);
        }
        return sceneRef.current;
    }

    /* ---------- lifecycle ---------- */

    useEffect(() => {
        mountedRef.current = true;

        assetManager
            .getAllAssets()
            .then(setAssets)
            .catch((error) => {
                console.error(error);
                setMessage("Could not load stored assets.");
            })
            .finally(() => setReady(true));

        return () => {
            mountedRef.current = false;
            sceneRef.current?.dispose();
            sceneRef.current = null;
            urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            urlsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(""), 4000);
        return () => clearTimeout(timer);
    }, [message]);

    /* ---------- thumbnails ---------- */

    function setThumb(id, blob) {
        if (!blob || !mountedRef.current) return;

        const previous = urlsRef.current.get(id);
        if (previous) URL.revokeObjectURL(previous);

        const url = URL.createObjectURL(blob);
        urlsRef.current.set(id, url);
        setThumbs((current) => ({ ...current, [id]: url }));
    }

    useEffect(() => {
        (async () => {
            for (const asset of assets) {
                if (urlsRef.current.has(asset.id) || attemptedRef.current.has(asset.id)) continue;
                attemptedRef.current.add(asset.id);

                try {
                    setThumb(asset.id, asset.thumbnail || (await assetManager.ensureThumbnail(asset)));
                } catch (error) {
                    console.warn("Thumbnail failed for", asset.name, error);
                }
            }
        })();
    }, [assets]);

    /* ---------- actions ---------- */

    async function handleUpload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        const modelFiles = files.filter((candidate) => /\.(glb|gltf)$/i.test(candidate.name));
        const file = modelFiles[0];
        if (!file) return;

        if (assets.length + modelFiles.length > MAX_ASSETS) {
            setModalMessage(UPLOAD_LIMIT_MESSAGE);
            return;
        }

        try {
            setBusy(true);
            setMessage("Uploading and preparing your environment...");

            const asset = await assetManager.upload(file, files);

            setAssets((previous) => [...previous, asset]);
            setActive(asset); // jump straight into the viewer
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(error.message || "Failed to upload asset.");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(asset) {
        try {
            await assetManager.deleteAsset(asset.id);
            sceneRef.current?.evict(asset.id);

            const url = urlsRef.current.get(asset.id);
            if (url) URL.revokeObjectURL(url);
            urlsRef.current.delete(asset.id);

            setThumbs(({ [asset.id]: _removed, ...rest }) => rest);
            setAssets((previous) => previous.filter((item) => item.id !== asset.id));
            setMessage(`${asset.name} deleted.`);
        } catch (error) {
            console.error(error);
            setMessage("Failed to delete asset.");
        }
    }

    async function confirmDelete() {
    const asset = pendingDelete;
    setPendingDelete(null);
    if (asset) await handleDelete(asset);
}

    const sortedAssets = [...assets].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <main>
            <input
                id={UPLOAD_INPUT_ID}
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                multiple
                onChange={handleUpload}
                disabled={busy}
                className="hidden"
            />

            <Hero />

            <FloatingNav />

            {!ready ? (
                <LoadingState />
            ) : assets.length === 0 ? (
                <EmptyState busy={busy} />
            ) : (
                <Library
                    assets={sortedAssets}
                    thumbs={thumbs}
                    busy={busy}
                    onOpen={setActive}
                    onDelete={setPendingDelete}
                />
            )}

            <Footer />

            {active && (
                <SceneViewer
                    asset={active}
                    assets={sortedAssets}
                    thumbs={thumbs}
                    getScene={getScene}
                    stageRef={stageRef}
                    onSelect={setActive}
                    onClose={() => setActive(null)}
                />
            )}

            {message && (
                <div
                    role="status"
                    className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/10 bg-black/85 px-5 py-3 font-gsans text-sm text-white shadow-2xl backdrop-blur"
                >
                    {message}
                </div>
            )}

            {modalMessage && (
                <Modal
                    title="Upload limit reached"
                    message={modalMessage}
                    onClose={() => setModalMessage("")}
                />
            )}

            {pendingDelete && (
                <Modal
                    title="Delete environment?"
                    message={`"${pendingDelete.name}" will be permanently removed from this browser. This can't be undone.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={confirmDelete}
                    onClose={() => setPendingDelete(null)}
                />
            )}
        </main>
    );
}

/* ====================================================================
   HERO: always at the top (same as the home page, with mouse parallax)
==================================================================== */

function Hero() {
    const reduce = useReducedMotion();

    const mx = useMotionValue(0);
    const my = useMotionValue(0);

    const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.5 });
    const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.5 });

    const x = useTransform(sx, [-0.5, 0.5], ["3%", "-3%"]);
    const y = useTransform(sy, [-0.5, 0.5], ["3%", "-3%"]);

    const handleMove = (e) => {
        if (reduce) return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleLeave = () => {
        mx.set(0);
        my.set(0);
    };

    return (
        <section
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            id="home"
            className="relative flex min-h-[80svh] w-full items-center justify-center overflow-hidden px-5 py-10 text-center text-white"
        >
            {/* Oversized (inset -5%) so it never reveals empty edges while moving */}
            <motion.div
                aria-hidden="true"
                style={{ backgroundImage: `url(${heroImg})`, x, y }}
                className="absolute inset-[-5%] bg-cover bg-center bg-no-repeat"
            />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <h1 className="text-3xl font-gsans font-medium sm:text-4xl">
                    <span className="font-playpen text-4xl font-bold sm:text-5xl">OculAR</span>{" "}
                   View 3D space in VR
                </h1>

                <p className="max-w-5xl text-base font-gsans sm:text-lg">
                    Store your 3D scenes in the browser and explore them in real time.
                    <br className="hidden md:block" />
                    Everything stays on your device, so your projects open instantly
                    <br className="hidden md:block" />
                    the next time you visit.
                </p>

                <a
                    href="#projects"
                    className="rounded-full bg-brand-secondary p-4 px-6 text-base font-medium text-on-accent font-gsans shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:brightness-95 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105"
                >
                    My Environments
                    <FontAwesomeIcon icon={faCube} className="ml-4" />
                </a>
            </div>
        </section>
    );
}

/* ====================================================================
   LOADING + EMPTY STATE: sections below the hero
==================================================================== */

function LoadingState() {
    return (
        <section
            id="projects"
            role="status"
            className="flex w-full items-center justify-center px-6 pb-24 pt-20 text-center font-gsans text-copy sm:pt-24 lg:pt-28"
        >
            <div>
                <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-brand-main/20 border-t-brand-main" />
                Loading your environments...
            </div>
        </section>
    );
}

function EmptyState({ busy }) {
    const { stagger, item } = useRevealVariants();

    return (
        <section
            id="projects"
            aria-labelledby="empty-projects-title"
            className="flex w-full flex-col items-center bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28"
        >
            <motion.div
                {...reveal}
                variants={stagger}
                className="mx-auto flex w-full max-w-7xl flex-col items-center"
            >
                <motion.div variants={item} className="mx-auto mb-14 max-w-2xl">
                    <h2
                        id="empty-projects-title"
                        className="mb-5 font-playpen text-3xl font-bold sm:text-4xl"
                    >
                        Your space is empty
                    </h2>

                    <p className="font-gsans text-base leading-7 text-brand-grey sm:text-lg">
                        Add a GLB or glTF scene to start exploring it in real time, on the web or in
                        VR. For glTF files, select the scene and its referenced files together.
                    </p>
                </motion.div>

                <motion.div
                    variants={item}
                    className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-2xl border border-dashed border-brand-main/20 bg-surface px-6 py-14"
                >
                    <label
                        htmlFor={UPLOAD_INPUT_ID}
                        aria-disabled={busy}
                        className={`${pillButton} ${busy ? "pointer-events-none opacity-60" : ""}`}
                    >
                        {busy ? "Preparing your scene..." : "Add a 3D scene"}
                        {!busy && <FontAwesomeIcon icon={faPlus} className="ml-2" />}
                    </label>

                    <p className="font-gsans text-xs text-brand-grey sm:text-sm">
                        Supported formats: .glb and .gltf
                    </p>
                </motion.div>
            </motion.div>
        </section>
    );
}

/* ====================================================================
   ACTIVE STATE: thumbnail library
==================================================================== */

function Library({ assets, thumbs, busy, onOpen, onDelete }) {
    const { stagger, item } = useRevealVariants();

    return (
        <section
            id="projects"
            className="flex w-full flex-col items-center bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28"
        >
            <motion.div
                {...reveal}
                variants={stagger}
                className="mx-auto flex w-full max-w-7xl flex-col items-center"
            >
                <motion.div variants={item} className="mx-auto mb-14 max-w-2xl">
                    <h2 className="mb-5 font-playpen text-3xl font-bold sm:text-4xl">
                        Your Environments
                    </h2>

                    <p className="font-gsans text-base leading-7 text-brand-grey sm:text-lg">
                        Select an environment to start exploring in VR
                    </p>
                </motion.div>

                <motion.div
                    variants={stagger}
                    className="grid w-full max-w-6xl grid-cols-1 gap-7 text-left md:grid-cols-3"
                >
                    {assets.map((asset) => (
                        <motion.div key={asset.id} variants={item} className="relative w-full">
                            <button
                                type="button"
                                onClick={() => onOpen(asset)}
                                className="group block h-full w-full overflow-hidden rounded-2xl border border-brand-main/5 bg-surface text-left transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:bg-brand-main hover:shadow-2xl focus-visible:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:outline-none"
                            >
                                <Thumbnail src={thumbs[asset.id]} name={asset.name} />

                                <div className="p-5">
                                    <h3 className="mb-2 truncate font-gsans text-lg font-semibold text-copy group-hover:text-brand-secondary">
                                        {asset.name}
                                    </h3>

                                    <p className="font-gsans text-sm leading-6 text-brand-grey group-hover:text-white/80">
                                        {formatFileSize(asset.size)} ·{" "}
                                        {new Date(asset.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => onDelete(asset)}
                                aria-label={`Delete ${asset.name}`}
                                className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 font-gsans text-xs text-white/80 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-red-500/80 hover:text-white"
                            >
                                Delete
                            </button>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.label
                    variants={item}
                    htmlFor={UPLOAD_INPUT_ID}
                    className={`${pillButton} mt-10 ${busy ? "pointer-events-none opacity-60" : ""}`}
                >
                    {busy ? "Processing..." : "Upload my AR environment"}
                    {!busy && <FontAwesomeIcon icon={faFileUpload} className="ml-2" />}
                </motion.label>
            </motion.div>
        </section>
    );
}

function Thumbnail({ src, name }) {
    if (!src) {
        return (
            <div className="flex h-56 w-full animate-pulse items-center justify-center bg-brand-main/10 font-gsans text-xs text-brand-grey">
                Generating preview...
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
    );
}

/* ====================================================================
   FULLSCREEN VIEWER
==================================================================== */

function SceneViewer({ asset, assets, thumbs, getScene, stageRef, onSelect, onClose }) {
    const mountRef = useRef(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [error, setError] = useState("");

    // Attach the shared canvas, start rendering; pause (don't destroy) on close
    useEffect(() => {
        const scene = getScene();
        const stage = stageRef.current;

        mountRef.current.appendChild(stage);

        if (!scene.initialized) {
            scene.init();
        } else {
            scene.resume();
            scene.onResize();
        }

        const onKey = (event) => {
            if (event.key === "Escape" && !document.pointerLockElement) onClose();
        };
        window.addEventListener("keydown", onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            document.exitPointerLock?.();
            scene.pause();
            stage.remove();
        };
    }, []);

    // Load (or swap to) the selected asset. Cached bytes/models make this instant.
    useEffect(() => {
        let cancelled = false;

        setStatus("loading");
        setError("");

        getScene()
            .loadAsset(asset.id)
            .then((result) => {
                if (!cancelled && result) setStatus("ready");
            })
            .catch((err) => {
                if (cancelled) return;
                console.error(err);
                setError(err.message || "Failed to load 3D scene.");
                setStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [asset.id]);

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* THREE.JS VIEWER */}
            <section ref={mountRef} className="absolute inset-0 h-full w-full" />

            {/* LOADING / ERROR */}
            {status !== "ready" && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="rounded-xl border border-white/10 bg-black/70 px-6 py-4 font-gsans text-sm text-white/70 backdrop-blur">
                        {status === "loading" ? `Loading ${asset.name}...` : error}
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="absolute left-5 top-5 z-20 flex max-h-[calc(100vh-40px)] w-[320px] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/80 p-5 text-white shadow-2xl backdrop-blur-xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="mb-5 flex items-center gap-2 self-start rounded-lg bg-white/10 px-3 py-2 font-gsans text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/20"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to environments
                </button>

                <h1 className="font-playpen text-xl font-bold">OculAR</h1>

                <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3">
                    <span className="block text-[11px] text-white/40">Currently viewing</span>
                    <strong className="mt-1 block truncate text-sm font-medium">{asset.name}</strong>
                </div>

                {/* Switch scenes */}
                {assets.length > 1 && (
                    <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-medium">Your Scenes</h2>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
                                {assets.length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {assets.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onSelect(item)}
                                    onMouseEnter={() => assetManager.prefetch(item.id)}
                                    aria-current={item.id === asset.id}
                                    className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] ${
                                        item.id === asset.id
                                            ? "border-white/30 bg-white/10"
                                            : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                                    }`}
                                >
                                    {thumbs[item.id] ? (
                                        <img
                                            src={thumbs[item.id]}
                                            alt=""
                                            className="h-10 w-14 flex-none rounded object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-14 flex-none rounded bg-white/10" />
                                    )}

                                    <span className="min-w-0">
                                        <strong className="block truncate text-xs font-medium">
                                            {item.name}
                                        </strong>
                                        <span className="block text-[10px] text-white/30">
                                            {formatFileSize(item.size)}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="mt-6 border-t border-white/10 pt-5">
                    <h2 className="text-sm font-medium">Controls</h2>

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

                        <ControlItem>
                            <Key>Esc</Key>
                            <span>Release mouse / leave</span>
                        </ControlItem>
                    </div>

                    <p className="mt-4 text-[11px] leading-4 text-white/30">
                        Click inside the scene to capture the mouse. Use the VR button to enter
                        immersive mode when a compatible headset is connected.
                    </p>
                </div>
            </aside>
        </div>
    );
}

function ControlItem({ children }) {
    return <div className="flex items-center gap-1.5 text-xs text-white/40">{children}</div>;
}

function Key({ children }) {
    return (
        <kbd className="inline-flex min-h-5 items-center justify-center rounded border border-white/10 bg-white/5 px-1.5 text-[9px] font-medium text-white/60">
            {children}
        </kbd>
    );
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB"];
    const index = Math.min(
        units.length - 1,
        Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024)))
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}