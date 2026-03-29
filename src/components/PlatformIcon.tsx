import { Platform } from "@/lib/video";

interface Props {
  platform: Platform;
  size?: number;
  className?: string;
}

/** YouTube play-button triangle */
function YouTubeIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  );
}

/** Niconico TV screen shape */
function NiconicoIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M2 4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2zm4 5h2v6H6V9zm10 0h2v6h-2V9zm-7 2h6v2H9v-2z" />
    </svg>
  );
}

/** SoundCloud cloud shape */
function SoundCloudIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M1 18V14h1v4H1zm2-1V12h1v5H3zm2 1V10h1v8H5zm2-1V8h1v9H7zm2 1V6h1v12H9zm2-1V4h1v13h-1zm2.5 1c-.8 0-1.5-.7-1.5-1.5V7a5.5 5.5 0 0 1 10.8-1A4 4 0 0 1 20 14h-6.5z" />
    </svg>
  );
}

export default function PlatformIcon({ platform, size = 14, className }: Props) {
  switch (platform) {
    case "youtube":
      return <YouTubeIcon size={size} className={className} />;
    case "niconico":
      return <NiconicoIcon size={size} className={className} />;
    case "soundcloud":
      return <SoundCloudIcon size={size} className={className} />;
    default:
      return null;
  }
}
