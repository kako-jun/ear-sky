/**
 * Day-of-week rotating night scene background.
 * Images are placed in /public/bg/ as bg-0.webp through bg-6.webp
 * (0=Sunday, 6=Saturday)
 */
const SCENES = [
  "夜の港",       // Sunday
  "ネオン横丁",   // Monday
  "雨の路地裏",   // Tuesday
  "夜の雲と月",   // Wednesday
  "飲み屋街",     // Thursday
  "川沿いの夜景", // Friday
  "屋台の灯り",   // Saturday
];

export default function NightBackground() {
  const day = new Date().getDay();
  const src = `/bg/bg-${day}.webp`;

  return (
    <div
      className="bar-bg-image"
      role="presentation"
      aria-hidden="true"
      style={{ backgroundImage: `url(${src})` }}
      title={SCENES[day]}
    />
  );
}
