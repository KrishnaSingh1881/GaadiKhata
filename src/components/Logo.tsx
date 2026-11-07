type LogoProps={variant?:'mark'|'full';size?:number;className?:string}

export function Logo({variant='mark',size=30,className=''}:LogoProps) {
  return <img
    className={`icchamani-logo icchamani-logo-${variant} ${className}`}
    src="/icchamani-logo.svg?v=4"
    width={variant==='full'?size*2.4:size}
    height={size}
    alt="Icchamani Construction"
  />
}
