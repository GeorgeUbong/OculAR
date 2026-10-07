import React, { useEffect, useRef, useState } from "react";
import "../style.css";
import heroImg from "../assets/hero.png";
import FloatingNav from "../components/navBar.jsx";
import Footer from "../components/footer.jsx";
import Modal from "../components/Modal.jsx";
import {
  faPlus,
  faCube,
  faFileUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";

import { useNavigate } from "react-router-dom";
import { assetManager } from "../../pipeline/assetsManager.js";

const UPLOAD_INPUT_ID = "asset-upload";
const MAX_ASSETS = 3;
const UPLOAD_LIMIT_MESSAGE =
  "Cannot upload more than 3 assets at a time. Please delete one to add another asset.";

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

export default function MyProjects() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [thumbs, setThumbs] = useState({}); // id -> object URL

  const urlsRef = useRef(new Map());
  const attemptedRef = useRef(new Set());
  const mountedRef = useRef(true);

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
    for (const asset of assets) {
      if (urlsRef.current.has(asset.id) || attemptedRef.current.has(asset.id))
        continue;
      attemptedRef.current.add(asset.id);
      setThumb(asset.id, asset.thumbnail);
    }
  }, [assets]);

  /* ---------- actions ---------- */

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const modelFiles = files.filter((candidate) =>
      /\.(glb|gltf)$/i.test(candidate.name),
    );
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
      navigate(`/projects/${asset.id}`);
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
          onOpen={(asset) => navigate(`/projects/${asset.id}`)}
          onDelete={setPendingDelete}
        />
      )}

      <Footer />

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
          <span className="font-playpen text-4xl font-bold sm:text-5xl">
            OculAR
          </span>{" "}
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
            Add a GLB or glTF scene to start exploring it in real time, on the
            web or in VR. For glTF files, select the scene and its referenced
            files together.
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
            <motion.div
              key={asset.id}
              variants={item}
              className="relative w-full"
            >
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

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))),
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

