import React, { useState } from 'react';
import '../style.css';
import heroImg from '../assets/hero.png';
import create from '../assets/create.jpg';
import upload from '../assets/upload.png';
import explore from '../assets/explore.jpg';
import footerImg from '../assets/footer.png';
import FloatingNav from '../components/navBar.jsx';
import { useNavigate } from 'react-router-dom';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Footer from '../components/footer.jsx';
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

const featureCards = [
  {
    title: 'Create your environment',
    body: 'Build quick concept scenes with your preferred layout and materials.',
    image: create,
  },
  {
    title: 'Mount your asset',
    body: 'Preview models, objects, and scenes in a clean presentation workspace.',
    image: upload,
  },
  {
    title: 'Explore in VR',
    body: 'Inspect your environment in immersive viewing mode with responsive controls.',
    image: explore,
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

function Hero({ onViewProjects }) {
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

        <button onClick={onViewProjects} className='rounded-full bg-brand-secondary p-4 px-6 text-base font-medium text-on-accent font-gsans shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:brightness-95 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105'>
          View Live Projects
          <FontAwesomeIcon icon={faArrowRight} className='ml-4' />
        </button>
      </div>
    </section>
  );
}

/* ---------- page ---------- */

export default function HomePage() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();
  const { stagger, item, fromLeft } = useRevealVariants();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setForm(initialForm);
  };

  return (
    // Matches the next section's colour so nothing dark can show beneath the hero
    <main>
      <Hero onViewProjects={() => navigate('/environments')} />

      <FloatingNav />

      <section id='about' className='w-full bg-transparent px-6 pb-24 pt-20 text-center text-copy sm:px-8 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28'>
        <div className='mx-auto max-w-6xl'>
          {/* What is OculAR */}
          <motion.div variants={stagger} {...reveal}>
            <motion.h2 variants={item} className='font-playpen text-5xl font-bold'>
              What is OculAR
            </motion.h2>

            <motion.p
              variants={item}
              className='mx-auto mt-8 max-w-4xl text-lg leading-relaxed text-brand-grey font-gsans'
            >
              OculAR is a lightweight 3D viewer built for quick environment testing and visual
              inspection. Instantly load, test, and present interactive 3D scenes with responsive
              lighting, PBR material checks, and precise camera controls—no heavy software required.
            </motion.p>
          </motion.div>

          {/* Feature cards: staggered one after another */}
          <motion.div variants={stagger} {...reveal} className='mt-16 grid gap-6 md:grid-cols-3 lg:gap-8'>
            {featureCards.map((feature) => (
              <motion.div key={feature.title} variants={item} className='w-full'>
                <div className='group h-full w-full overflow-hidden rounded-2xl border border-brand-main/5 bg-surface transition-all duration-300 hover:-translate-y-2 hover:bg-brand-main hover:shadow-2xl'>
                  <div className='h-40 w-full overflow-hidden'>
                    <div
                      className='h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105'
                      style={{ backgroundImage: `url(${feature.image})` }}
                    />
                  </div>

                  <div className='px-5 pb-6 pt-5 text-left'>
                    <h3 className='font-playpen text-2xl font-bold leading-tight text-copy transition-colors duration-300 group-hover:text-brand-secondary sm:text-3xl'>
                      {feature.title}
                    </h3>
                    <p className='mt-3 font-gsans text-sm leading-relaxed text-brand-grey transition-colors duration-300 group-hover:text-white/80 sm:text-base'>
                      {feature.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* View your Environments */}
          <motion.div variants={stagger} {...reveal} className='mt-20 text-center'>
            <motion.h3 variants={item} className='font-playpen text-5xl font-bold text-copy transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:translate-x-1'>
              View your Environments
            </motion.h3>

            <motion.p
              variants={item}
              className='mx-auto mt-8 max-w-4xl text-lg leading-relaxed text-brand-grey font-gsans'
            >
              Test, inspect, and present your interactive 3D scenes in real time without the overhead
              of heavy software. Effortlessly upload your models to evaluate PBR materials, verify
              camera perspectives, and fine-tune environment lighting on the fly. Streamline your
              visual review process with high-performance cross-platform rendering designed for rapid
              feedback. Focus on perfecting your creative assets while keeping your workflow fast,
              seamless, and efficient.
            </motion.p>

            <motion.button
              variants={item}
              onClick={() => navigate('/projects')}
              className='mt-10 rounded-full bg-brand-secondary px-8 py-4 text-lg font-medium text-on-accent font-gsans shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:brightness-95 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105'
            >
              Upload my Environment <FontAwesomeIcon icon={faArrowRight} className='ml-2' />
            </motion.button>
          </motion.div>
        </div>
      </section>

      <footer
        id='contact'
        className='w-full bg-surface px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'
        style={{
          backgroundImage: `linear-gradient(var(--support-overlay), var(--support-overlay)), url(${footerImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color: 'white',
        }}
      >
        <div className='mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-20'>
          {/* Left text slides in from the side */}
          <motion.div
            variants={fromLeft}
            {...reveal}
            className='text-center md:text-left'
          >
            <h2 className='font-playpen text-3xl font-bold leading-tight text-copy sm:text-4xl lg:text-5xl'>
              Talk to OculAR Support Team
            </h2>
            <p className='mx-auto mt-4 max-w-md font-gsans text-base text-copy md:mx-0 lg:text-lg'>
              Feel free to reach out for help with your order or any questions you may have regarding your purchase.
            </p>
          </motion.div>

          {/* Form fields rise in one by one */}
          <motion.form
            onSubmit={handleSubmit}
            variants={stagger}
            {...reveal}
            className='flex w-full flex-col gap-4 font-gsans'
          >
            <motion.div variants={item} className='flex flex-col gap-1.5'>
              <label htmlFor='contact-name' className='text-xs text-copy'>
                Enter your name
              </label>
              <input
                id='contact-name'
                name='name'
                type='text'
                autoComplete='name'
                required
                value={form.name}
                onChange={handleChange}
                placeholder='John Boyega'
                className={fieldClass}
              />
            </motion.div>

            <motion.div variants={item} className='flex flex-col gap-1.5'>
              <label htmlFor='contact-email' className='text-xs text-copy'>
                Enter your Email
              </label>
              <input
                id='contact-email'
                name='email'
                type='email'
                autoComplete='email'
                required
                value={form.email}
                onChange={handleChange}
                placeholder='John32@email.com'
                className={fieldClass}
              />
            </motion.div>

            <motion.div variants={item} className='flex flex-col gap-1.5'>
              <label htmlFor='contact-message' className='text-xs text-copy'>
                Enter your message
              </label>
              <textarea
                id='contact-message'
                name='message'
                required
                rows={6}
                value={form.message}
                onChange={handleChange}
                placeholder='How can we help?'
                className={`${fieldClass} min-h-[9rem] resize-y`}
              />
            </motion.div>

            <motion.button
              variants={item}
              type='submit'
              className='mt-2 self-stretch rounded-lg bg-brand-secondary p-4 px-6 text-base font-medium text-on-accent transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105 sm:self-start'
            >
              Send message
            </motion.button>
          </motion.form>
        </div>
      </footer>

      <Footer />
    </main>
  );
}