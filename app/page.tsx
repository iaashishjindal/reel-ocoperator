'use client';
import ReelGenerator from '@/components/ReelGenerator';

const BUILD_TIME = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 font-sans">
      <div className="fixed top-3 right-4 flex items-center gap-3 z-50">
        <span className="text-[10px] font-mono text-neutral-600 hidden sm:block">
          build {BUILD_TIME} IST
        </span>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10"
        >
          Sign out
        </button>
      </div>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-3 pt-4 pb-8 border-b border-white/5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            GPT Unfiltered <span className="text-emerald-500">Reel Generator</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Create perfectly timed 9:16 typing animations for Instagram Reels.
            Just enter your text, record the animation, and download the video.
          </p>
        </header>
        <ReelGenerator />
      </div>
    </main>
  );
}
