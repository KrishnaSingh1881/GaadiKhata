type LogoProps={variant?:'mark'|'full';size?:number;className?:string}

export function Logo({variant='mark',size=42,className=''}:LogoProps) {
  const mark=<span className={`icchamani-logo-badge ${className}`} style={{width:size,height:size,flexBasis:size}}><img className="icchamani-logo icchamani-logo-mark" src="/icchamani-logo.svg" alt={variant==='full'?'':'Icchamani Construction'} width={size-12} height={size-12}/></span>
  return variant==='full'?<span className="brand-lockup">{mark}<span className="brand-copy"><strong>Icchamani Construction</strong><small>Powered by GaadiKhata</small></span></span>:mark
}
