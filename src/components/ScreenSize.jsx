import React, { useEffect, useState } from "react";
import { faDesktop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import logo from '../assets/logo.png';

const MIN_WIDTH = 1024; // px, matches Tailwind's `lg`

/** Warning page. Use it directly, or via <DesktopOnly>. */
export default function ScreenTooSmall() {
    return (
        <main
            role="alert"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#101010] px-6 text-center text-white"
        >
            {/**<img src={logo} alt="logo VR" height={100} width={100} /> */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
            
                <FontAwesomeIcon icon={faDesktop} className="text-3xl text-white/80" />
            </div>

            <h1 className="font-playpen text-3xl font-bold sm:text-4xl">
                Screen size too small
            </h1>

            <p className="max-w-md font-gsans text-base leading-7 text-white/70">
                OculAR&apos;s 3D viewer needs more room to work properly. Please open this
                page on a desktop or laptop to continue.
            </p>
        </main>
    );
}

/** True while the viewport is at least `minWidth` wide. Updates on resize. */
export function useIsDesktop(minWidth = MIN_WIDTH) {
    const query = `(min-width: ${minWidth}px)`;

    const [matches, setMatches] = useState(() =>
        typeof window === "undefined" ? true : window.matchMedia(query).matches
    );

    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = (event) => setMatches(event.matches);

        setMatches(media.matches);
        media.addEventListener("change", onChange);

        return () => media.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}

/**
 * Wrap anything that needs a big screen:
 * <DesktopOnly><ViewerPage /></DesktopOnly>
 */
export function DesktopOnly({ children, minWidth = MIN_WIDTH }) {
    const isDesktop = useIsDesktop(minWidth);

    return isDesktop ? children : <ScreenTooSmall />;
}