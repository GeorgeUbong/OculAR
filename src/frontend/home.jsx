
import '../style.css';

export default function HomePage() {
    return (
        <main>
            <section className='h-svh flex-col text-center justify-center w-full flex items-center gap-10' >
                <h1>
                    <span>OculAR</span> View 3D space in VR
                </h1>

                <p>Test and inspect interactive 3D scenes
                    in real time without heavy software.<br/>
                    Upload models, fine-tune materials, cameras, and lighting with fast, seamless <br/>cross-platform rendering.</p>
                <button className="bg-green-400 p-4 rounded-lg">View Live Projects</button>
            </section>

            {/**Mid section */}
            <section className=' bg-color-white'>
        <h2>What is oculAR</h2>
            </section>
        </main>  
    )
};



