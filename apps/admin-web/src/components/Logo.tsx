export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 200 200'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-label='Flaresmith Logo'
    >
      <defs>
        <linearGradient id='flame-grad-admin' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#FF6B35' stopOpacity={1} />
          <stop offset='50%' stopColor='#F7931E' stopOpacity={1} />
          <stop offset='100%' stopColor='#FDC830' stopOpacity={1} />
        </linearGradient>
        <linearGradient id='hammer-grad-admin' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#4A90E2' stopOpacity={1} />
          <stop offset='100%' stopColor='#7B68EE' stopOpacity={1} />
        </linearGradient>
      </defs>
      {/* Flame */}
      <path
        d='M100 30 C90 50, 85 70, 90 90 C95 110, 105 110, 110 90 C115 70, 110 50, 100 30 Z'
        fill='url(#flame-grad-admin)'
        opacity={0.9}
      />
      <path
        d='M100 40 C95 55, 92 65, 95 80 C98 95, 102 95, 105 80 C108 65, 105 55, 100 40 Z'
        fill='url(#flame-grad-admin)'
        opacity={0.7}
      />
      {/* Hammer */}
      <path
        d='M80 120 L120 120 L120 130 L80 130 Z'
        fill='url(#hammer-grad-admin)'
      />
      <rect
        x='95'
        y='130'
        width='10'
        height='50'
        rx='2'
        fill='url(#hammer-grad-admin)'
      />
      <path
        d='M75 115 L125 115 L125 120 L75 120 Z'
        fill='url(#hammer-grad-admin)'
        opacity={0.8}
      />
    </svg>
  );
}
