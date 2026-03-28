'use client';
import ReelGenerator from '@/components/ReelGenerator';

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 font-sans">
      <button
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }}
        className="fixed top-4 right-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors z-50"
      >
        Sign out
      </button>
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
