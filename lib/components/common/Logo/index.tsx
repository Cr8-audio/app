import { cn } from '@/lib/utils/tailwind';

interface CrateLogoProps {
  className?: string;
}

const CrateLogo = ({ className }: CrateLogoProps) => {
  return (
    <img
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className={cn('block shrink-0', className)}
    />
  );
};

export default CrateLogo;
