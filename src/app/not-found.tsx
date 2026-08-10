import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-news grid place-items-center py-24 text-center">
      <div>
        <p className="text-6xl font-black text-brand">404</p>
        <h1 className="mt-3 text-2xl font-bold">यह पेज नहीं मिला</h1>
        <p className="mt-2 text-[var(--text-soft)]">हो सकता है खबर हटा दी गई हो या पता बदल गया हो।</p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 font-semibold text-white">होम पर जाएँ</Link>
      </div>
    </div>
  );
}
