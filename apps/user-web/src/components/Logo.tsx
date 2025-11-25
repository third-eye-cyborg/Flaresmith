export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 400 400'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-label='Flaresmith Logo'
      preserveAspectRatio='xMidYMid meet'
    >
      {/* Orange cloud - smooth rounded blob */}
      <path
        d='M 120 200 Q 100 170 120 145 Q 145 125 175 130 Q 205 115 240 130 Q 275 140 295 165 Q 320 160 340 180 Q 355 200 350 225 Q 360 240 355 265 Q 345 290 315 298 Q 300 310 275 312 Q 245 318 215 308 Q 185 315 155 303 Q 130 288 120 260 Q 105 240 110 215 Q 115 205 120 200 Z'
        fill='#FF6B35'
      />
      
      {/* White infinity flow through center */}
      <path
        d='M 170 210 Q 185 195 205 202 Q 225 210 230 228 Q 235 246 220 256 Q 210 263 195 256 Q 185 248 180 232 Q 175 218 170 210 Z'
        fill='white'
        opacity='0.9'
      />
      <path
        d='M 230 228 Q 235 218 250 212 Q 265 206 280 220 Q 292 234 287 250 Q 282 264 268 268 Q 254 270 243 258 Q 237 248 230 228 Z'
        fill='white'
        opacity='0.9'
      />
      
      {/* White gear on the right edge */}
      <g transform='translate(320, 240)'>
        {/* Outer gear circle */}
        <circle cx='0' cy='0' r='45' fill='white' />
        
        {/* 8 gear teeth */}
        <rect x='-6' y='-50' width='12' height='18' fill='white' rx='2' />
        <rect x='-6' y='32' width='12' height='18' fill='white' rx='2' />
        <rect x='-50' y='-6' width='18' height='12' fill='white' rx='2' />
        <rect x='32' y='-6' width='18' height='12' fill='white' rx='2' />
        
        <g transform='rotate(45)'>
          <rect x='-6' y='-50' width='12' height='18' fill='white' rx='2' />
          <rect x='-6' y='32' width='12' height='18' fill='white' rx='2' />
          <rect x='-50' y='-6' width='18' height='12' fill='white' rx='2' />
          <rect x='32' y='-6' width='18' height='12' fill='white' rx='2' />
        </g>
        
        {/* Inner orange circle */}
        <circle cx='0' cy='0' r='28' fill='#FF6B35' />
        
        {/* Center hole */}
        <circle cx='0' cy='0' r='12' fill='white' />
      </g>
    </svg>
  );
}
