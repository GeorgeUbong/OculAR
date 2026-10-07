import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBehance, faLinkedinIn, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faCube } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';

const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ubongabasi-george-a33731234/?isSelfProfile=true', icon: faLinkedinIn },
  { label: 'X', href: 'https://x.com/just_ubby', icon: faXTwitter },
  { label: 'Behance', href: 'https://www.behance.net/2ubongGeorge', icon: faBehance },
];

const linkGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Environments', href: '/environments' },
      { label: 'Your environments', href: '/environments#your-environments' },
      { label: 'Upload an environment', href: '/environments#your-environments' },
    ],
  },
  /**{
    title: 'Support',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'Supported formats', href: '/formats' },
      { label: 'Contact', href: '/#contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of use', href: '/terms' },
      { label: 'Cookie settings', href: '/cookies' },
    ],
  }, */
];

const linkClass =
  'font-gsans text-sm text-white/70 transition-colors hover:text-brand-secondary focus:outline-none focus-visible:text-brand-secondary focus-visible:underline';

export default function Footer() {
  return (
    <footer className='w-full bg-brand-main text-white'>
      <div className='mx-auto w-full max-w-7xl px-6 pb-10 pt-16 sm:px-8 lg:px-10 lg:pt-20'>
        <div className='grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10'>
          <div className='lg:col-span-4'>
            <a href='/' className='inline-flex items-center gap-3' aria-label='OculAR home'>
              <span
                aria-hidden='true'
                className='flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-brand-secondary/60 text-brand-secondary'
              >
                <img src={logo} alt='logo image'/>
              </span>
              <span className='font-playpen text-2xl font-bold'>OculAR</span>
            </a>

            <p className='mt-5 max-w-sm font-gsans text-sm leading-6 text-white/70'>
              OculAR lets you test and inspect interactive 3D scenes in real time, right in the
              browser. Upload a model, adjust materials, cameras and lighting, then step inside
              in VR without heavy software.
            </p>
          </div>

          <div className='lg:col-span-4'>
            <h3 className='font-gsans text-sm font-semibold text-brand-secondary'>
              Find us on social media
            </h3>

            <ul className='mt-4 flex items-center gap-3'>
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={social.label}
                    className='flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:border-brand-secondary hover:bg-brand-secondary hover:text-brand-main focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-main'
                  >
                    <FontAwesomeIcon icon={social.icon} />
                  </a>
                </li>
              ))}
            </ul>

            <h3 className='mt-8 font-gsans text-sm font-semibold text-brand-secondary'>
              About the creator
            </h3>
            <p className='mt-3 max-w-sm font-gsans text-sm leading-6 text-white/70'>
              Built by a software developer who enjoys turning heavy 3D workflows into simple,
              fast tools for the web. Say hello on any of the channels above.
            </p>
          </div>

         <div className='grid grid-cols-2 gap-10 sm:col-span-2 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1 xl:grid-cols-3'>
            {linkGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className='font-gsans text-sm font-semibold text-brand-secondary'>
                  {group.title}
                </h3>
                <ul className='mt-4 flex flex-col gap-3'>
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div> 
        </div>

        <div className='mt-14 flex flex-col gap-2 border-t border-white/15 pt-6 font-gsans text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between'>
          <p>&copy; {new Date().getFullYear()} OculAR. All rights reserved.</p>
          <p>Designed and developed by your name here.</p>
        </div>
      </div>
    </footer>
  );
}
