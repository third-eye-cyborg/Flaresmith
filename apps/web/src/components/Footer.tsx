import Link from 'next/link';

export function Footer() {
  return (
    <footer className='mt-24 border-t border-neutral-800/40 pt-12 pb-16 bg-neutral-950'>
      <div className='max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm'>
        <div className='space-y-3'>
          <h3 className='font-semibold text-neutral-100'>Flaresmith</h3>
          <p className='text-neutral-400 text-xs leading-relaxed'>Spec-first orchestration across GitHub, Cloudflare, Neon & Postman. Built for environment parity & intelligent automation.</p>
        </div>
        <div className='space-y-3'>
          <h3 className='font-semibold text-neutral-100'>Product</h3>
          <ul className='space-y-1'>
            <li><Link className='text-neutral-400 hover:text-neutral-200 transition-colors' href='/features'>Features</Link></li>
            <li><Link className='text-neutral-400 hover:text-neutral-200 transition-colors' href='/pricing'>Pricing</Link></li>
            <li><Link className='text-neutral-400 hover:text-neutral-200 transition-colors' href='/projects'>Dashboard</Link></li>
          </ul>
        </div>
        <div className='space-y-3'>
          <h3 className='font-semibold text-neutral-100'>Resources</h3>
          <ul className='space-y-1'>
            <li><a className='text-neutral-400 hover:text-neutral-200 transition-colors' href='https://github.com/third-eye-cyborg/CloudMake' target='_blank' rel='noopener noreferrer'>GitHub</a></li>
            <li><Link className='text-neutral-400 hover:text-neutral-200 transition-colors' href='/design-sync'>Design Sync</Link></li>
          </ul>
        </div>
      </div>
      <div className='mt-12 text-center text-xs text-neutral-600'>© {new Date().getFullYear()} Flaresmith. All rights reserved.</div>
    </footer>
  );
}
