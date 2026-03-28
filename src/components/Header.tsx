export default function Header() {
  return (
    <header className="text-center pt-8 pb-4 px-4">
      {/* ネオン看板風タイトル */}
      <h1 className="text-2xl md:text-3xl font-bold neon-text tracking-wider">
        Ear in the Sky Diamond
      </h1>
      <p className="text-xs text-white/40 mt-1 tracking-widest">
        — イヤスカ —
      </p>
      <p className="text-sm text-white/50 mt-3">
        あの歌、こう聞こえない？
      </p>
    </header>
  );
}
