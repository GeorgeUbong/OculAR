import React, { useState } from 'react';
import '../style.css';
import heroImg from '../assets/hero.png';
import FloatingNav from '../components/navBar';
import Footer from '../components/footer';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useReducedMotion,
} from 'motion/react';


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

function Hero() {
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

                <button className='mt-10 rounded-full bg-brand-secondary px-8 py-4 text-lg font-medium text-on-accent font-gsans shadow-sm transition hover:brightness-95'>
                    Upload my Environment <FontAwesomeIcon icon={faPlus} className='ml-2' />
                </button>
            </div>
        </section>
    );
}

/* ---------- page ---------- */

export default function HomePage() {

    const { stagger, item, fromLeft } = useRevealVariants();


    return (
        // Matches the next section's colour so nothing dark can show beneath the hero
        <main>
            <Hero />

            <FloatingNav />

            {/**TEST ENVIRONMENTS */}
<section className="flex w-full flex-col items-center bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28">
    <motion.div
        {...reveal}
        variants={stagger}
        className="mx-auto flex w-full max-w-7xl flex-col items-center"
    >
        <motion.div variants={item} className="mx-auto mb-14 max-w-2xl">
            <h2 className="mb-5 font-playpen text-3xl font-bold sm:text-4xl">
                Environments
            </h2>

            <p className="font-gsans text-base leading-7 text-brand-grey sm:text-lg">
                Explore a collection of test environments and interactive 3D spaces
                built for real-time exploration directly in the browser.
            </p>
        </motion.div>

        {/* Cards */}
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

{/**USER UPLOADED FILES */}
<section className='w-full bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28'>
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
                Click the button below to start exploring in VR
            </p>
        </motion.div>

        {/* Cards */}
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

        <motion.button
            variants={item}
            className='mt-10 rounded-full bg-brand-secondary px-8 py-4 text-lg font-medium text-on-accent font-gsans shadow-sm transition hover:brightness-95'
        >
            Upload my Environment <FontAwesomeIcon icon={faPlus} className='ml-2' />
        </motion.button>
    </motion.div>
</section>

            <Footer />

        </main>
    );
}