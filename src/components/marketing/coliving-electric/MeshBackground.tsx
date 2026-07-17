/** Soft pink / purple / cyan mesh glow behind the dark canvas. */
export default function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-[-10%] h-[42rem] w-[42rem] rounded-full bg-fuchsia-500/25 blur-[120px]" />
      <div className="absolute right-[-15%] top-[15%] h-[36rem] w-[36rem] rounded-full bg-violet-600/30 blur-[110px]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[40rem] w-[40rem] rounded-full bg-cyan-400/20 blur-[130px]" />
      <div className="absolute right-[10%] bottom-[20%] h-[28rem] w-[28rem] rounded-full bg-orange-500/15 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_0%,_#020617_70%)]" />
    </div>
  )
}
