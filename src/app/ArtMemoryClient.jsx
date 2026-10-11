'use client';
import dynamic from 'next/dynamic';
// Progress lives in the browser. Read it only after mounting, before rendering
// the app, so server defaults cannot overwrite or mismatch saved progress.
const ArtMemory = dynamic(() => import('../App.jsx'), {
  ssr: false,
  loading: () => <main className="crash" role="status"><h1>артблять.</h1></main>,
});
export default function ArtMemoryClient() { return <ArtMemory />; }
