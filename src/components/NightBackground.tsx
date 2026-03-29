/**
 * Day-of-week rotating night scene background.
 * Images are placed in /public/bg/ as bg-0.webp through bg-6.webp
 * (0=Sunday, 6=Saturday)
 */
// bg-0=Sun(夜の港) bg-1=Mon(ネオン横丁) bg-2=Tue(雨の路地裏)
// bg-3=Wed(夜の雲と月) bg-4=Thu(飲み屋街) bg-5=Fri(川沿いの夜景) bg-6=Sat(屋台の灯り)

export default function NightBackground() {
  const src = `/bg/bg-${new Date().getDay()}.webp`;

  return (
    <div
      className="bar-bg-image"
      role="presentation"
      aria-hidden="true"
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}
