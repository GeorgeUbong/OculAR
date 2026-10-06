import React, { useEffect, useState } from 'react';
import '../style.css';
import heroImg from '../assets/hero.png';
import FloatingNav from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import { faFileUpload, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion,
} from 'motion/react';
import { assetManager } from '../../pipeline/assetsManager.js';


const initialForm = { name: '', email: '', message: '' };

const fieldClass =
    'w-full rounded-md border border-copy/15 bg-surface px-3 py-2.5 text-sm text-copy placeholder:text-muted focus:border-brand-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary';

const environments = [
    {
        title: 'Create your environment',
        body: 'Build quick concept scenes with your preferred layout and materials.',
        image: heroImg,
    },
    {
        title: 'Mount your asset',
        body: 'Preview models, objects, and scenes in a clean presentation workspace.',
        image: heroImg,
    },
    {
        title: 'Explore in VR',
        body: 'Inspect your environment in immersive viewing mode with responsive controls.',
        image: heroImg,
    },
];

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.min(
        units.length - 1,
        Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024)))
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

/* ---------- scroll-reveal helpers ---------- */

// Props that make a container reveal once when ~25% of it is on screen.
const reveal = {
    initial: 'hidden',
    whileInView: 'show',
    viewport: { once: true, amount: 0.25 },
};

// Builds variants; offsets collapse to a plain fade for reduced-motion users.
function useRevealVariants() {
    const reduce = useReducedMotion();
    const offset = reduce ? 0 : 28;

    return {
        // parent: just staggers its children
        stagger: {
            hidden: {},
            show: { transition: { staggerChildren: reduce ? 0 : 0.12 } },
        },
        // child: fade + rise
        item: {
            hidden: { opacity: 0, y: offset },
            show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            },
        },
        // child: fade + slide in from the left
        fromLeft: {
            hidden: { opacity: 0, x: -offset },
            show: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
            },
        },
    };
}

/* ---------- hero with mouse parallax ---------- */

function Hero({ onUploadEnvironment }) {
    const reduce = useReducedMotion();

    // pointer position inside the hero, -0.5 → 0.5 on each axis
    const mx = useMotionValue(0);
    const my = useMotionValue(0);

    // springs make the image ease toward the pointer instead of snapping
    const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.5 });
    const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.5 });

    // image drifts opposite to the pointer for a sense of depth
    const x = useTransform(sx, [-0.5, 0.5], ['3%', '-3%']);
    const y = useTransform(sy, [-0.5, 0.5], ['3%', '-3%']);

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
            id='home'
            className='relative flex min-h-[80svh] w-full items-center justify-center overflow-hidden px-5 py-10 text-center text-white'
        >
            {/* Image layer is oversized (inset -5%) so it never reveals empty edges while moving */}
            <motion.div
                aria-hidden='true'
                style={{ backgroundImage: `url(${heroImg})`, x, y }}
                className='absolute inset-[-5%] bg-cover bg-center bg-no-repeat'
            />

            <div className='relative z-10 flex flex-col items-center gap-6'>
                <h1 className='text-3xl font-gsans font-medium sm:text-4xl'>
                    <span className='font-playpen text-4xl font-bold sm:text-5xl'>OculAR</span> View 3D space in VR
                </h1>

                <p className='max-w-5xl text-base font-gsans sm:text-lg'>
                    Test and inspect interactive 3D scenes in real time without heavy software.
                    <br className='hidden md:block' />
                    Upload models, fine-tune materials, cameras, and lighting with fast, seamless
                    <br className='hidden md:block' />
                    cross-platform rendering.
                </p>

                <button onClick={onUploadEnvironment}  className='rounded-full bg-brand-secondary p-4 px-6 text-base font-medium text-on-accent font-gsans shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:brightness-95 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105'>
                    Upload my Environment <FontAwesomeIcon icon={faFileUpload} className='ml-2' />
                </button>
            </div>
        </section>
    );
}

/* ---------- page ---------- */

export default function HomePage() {
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [thumbs, setThumbs] = useState({});
    const [ready, setReady] = useState(false);
    const { stagger, item, fromLeft } = useRevealVariants();

    useEffect(() => {
        let mounted = true;

        assetManager.getAllAssets()
            .then((storedAssets) => {
                if (mounted) {
                    setAssets(storedAssets.sort((a, b) => b.createdAt - a.createdAt));
                }
            })
            .catch((error) => console.error('Could not load stored environments.', error))
            .finally(() => {
                if (mounted) setReady(true);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const objectUrls = [];

        async function loadThumbnails() {
            for (const asset of assets) {
                try {
                    const blob = asset.thumbnail || await assetManager.ensureThumbnail(asset);
                    if (!blob || cancelled) continue;

                    const url = URL.createObjectURL(blob);
                    objectUrls.push(url);
                    setThumbs((current) => ({ ...current, [asset.id]: url }));
                } catch (error) {
                    console.warn('Thumbnail failed for', asset.name, error);
                }
            }
        }

        loadThumbnails();

        return () => {
            cancelled = true;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [assets]);


    return (
        // Matches the next section's colour so nothing dark can show beneath the hero
        <main>
            <Hero onUploadEnvironment={() => navigate('/projects')} />

            <FloatingNav />

            <section
                id="test-environments"
                className="flex w-full flex-col items-center bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28"
            >
                <motion.div
                    {...reveal}
                    variants={stagger}
                    className="mx-auto flex w-full max-w-7xl flex-col items-center"
                >
                    <motion.div variants={item} className="mx-auto mb-14 max-w-2xl">
                        <h2 className="mb-5 font-playpen text-3xl font-bold sm:text-4xl">
                            Test Environments
                        </h2>
                        <p className="font-gsans text-base leading-7 text-brand-grey sm:text-lg">
                            Explore a collection of test environments and interactive 3D spaces
                            built for real-time exploration directly in the browser.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={stagger}
                        className="grid w-full max-w-6xl grid-cols-1 gap-7 text-left md:grid-cols-3"
                    >
                        {environments.map((environment) => (
                            <motion.div key={environment.title} variants={item} className="w-full">
                                <div className="group h-full w-full overflow-hidden rounded-2xl border border-brand-main/5 bg-surface transition-all duration-300 hover:-translate-y-2 hover:bg-brand-main hover:shadow-2xl">
                                    <img
                                        src={environment.image}
                                        alt={environment.title}
                                        className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="p-5">
                                        <h3 className="mb-2 font-gsans text-lg font-semibold text-copy group-hover:text-brand-secondary">
                                            {environment.title}
                                        </h3>
                                        <p className="font-gsans text-sm leading-6 text-brand-grey group-hover:text-white/80">
                                            {environment.body}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            <section
                id="environments"
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
                            {assets.length > 0
                                ? 'Select an environment to view it in My Projects.'
                                : 'Your uploaded environments will appear here.'}
                        </p>
                    </motion.div>

                    {!ready ? (
                        <section
                            role="status"
                            className="flex w-full items-center justify-center px-6 py-14 text-center font-gsans text-copy"
                        >
                            <div>
                                <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-brand-main/20 border-t-brand-main" />
                                Loading your environments...
                            </div>
                        </section>
                    ) : assets.length === 0 ? (
                        <motion.div
                            variants={item}
                            className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-2xl border border-dashed border-brand-main/20 bg-surface px-6 py-14"
                        >
                            <h3 className="font-playpen text-2xl font-bold">Your space is empty</h3>
                            <p className="font-gsans text-base leading-7 text-brand-grey">
                                Add a GLB or glTF scene to start exploring it in real time, on the web or in VR.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/projects')}
                                className="inline-flex items-center rounded-full bg-brand-secondary px-8 py-4 text-lg font-medium text-on-accent font-gsans shadow-sm transition hover:brightness-95"
                            >
                                Add a 3D scene <FontAwesomeIcon icon={faPlus} className="ml-2" />
                            </button>
                            <p className="font-gsans text-xs text-brand-grey sm:text-sm">
                                Supported formats: .glb and .gltf
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            variants={stagger}
                            className="grid w-full max-w-6xl grid-cols-1 gap-7 text-left md:grid-cols-3"
                        >
                            {assets.map((asset) => (
                                <motion.button
                                    key={asset.id}
                                    variants={item}
                                    type="button"
                                    onClick={() => navigate('/projects')}
                                    className="group block h-full w-full overflow-hidden rounded-2xl border border-brand-main/5 bg-surface text-left transition-all duration-300 hover:-translate-y-2 hover:bg-brand-main hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
                                >
                                    {thumbs[asset.id] ? (
                                        <img
                                            src={thumbs[asset.id]}
                                            alt={asset.name}
                                            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-56 w-full animate-pulse items-center justify-center bg-brand-main/10 font-gsans text-xs text-brand-grey">
                                            Generating preview...
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <h3 className="mb-2 truncate font-gsans text-lg font-semibold text-copy group-hover:text-brand-secondary">
                                            {asset.name}
                                        </h3>
                                        <p className="font-gsans text-sm leading-6 text-brand-grey group-hover:text-white/80">
                                            {formatFileSize(asset.size)} · {new Date(asset.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </section>

            <Footer />

        </main>
    );
}