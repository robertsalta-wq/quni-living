import { Link } from 'react-router-dom'
import AiSparkleIcon from './AiSparkleIcon'

export default function LandlordAIBanner() {
  return (
    <section className="w-full bg-[#1A0B2E] text-white overflow-hidden relative">
      <style>{`
        .ai-banner-grid {
          background-image: radial-gradient(rgba(182,95,207,0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .ai-brain {
          border-radius: 50% 50% 45% 45% / 55% 55% 45% 45%;
          box-shadow: 0 0 30px rgba(182,95,207,0.6), 0 0 80px rgba(182,95,207,0.25);
          animation: ai-breathe 3s ease-in-out infinite;
        }
        .ai-dash {
          stroke-dasharray: 7 9;
          animation: ai-dash 2.4s linear infinite;
        }
        .ai-node {
          animation: ai-node 2.2s ease-in-out infinite;
        }
        .ai-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          backdrop-filter: blur(4px);
          animation: ai-float 3.5s ease-in-out infinite;
        }
        .ai-card-2 { animation-delay: 0.5s; }
        .ai-card-3 { animation-delay: 1s; }
        .ai-card-4 { animation-delay: 1.4s; }
        .ai-cursor::after {
          content: '|';
          margin-left: 1px;
          color: #E8583A;
          animation: ai-cursor 900ms steps(1, end) infinite;
        }
        @keyframes ai-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        @keyframes ai-dash {
          to { stroke-dashoffset: -48; }
        }
        @keyframes ai-node {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes ai-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-brain, .ai-dash, .ai-node, .ai-card, .ai-cursor::after { animation: none !important; }
        }
      `}</style>

      <div className="absolute -top-16 -right-20 w-72 h-72 bg-[radial-gradient(circle,rgba(182,95,207,0.32),rgba(26,11,46,0))] pointer-events-none" />

      <div className="ai-banner-grid max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(182,95,207,0.45)] bg-[rgba(182,95,207,0.2)] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#D49EE8]">
              <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#D49EE8]" />
              AI-powered platform
            </div>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
              Your listings. Priced. Written.
              <span className="block italic text-[#E8583A]">Filled by AI.</span>
            </h2>
            <p className="mt-4 text-white/50 text-base sm:text-lg leading-relaxed max-w-xl">
              The only student accommodation platform where AI writes your listing, prices it with live market data,
              and drafts your replies - all built into your dashboard.
            </p>
            <div className="mt-6">
              <Link
                to="/landlords/ai"
                className="inline-flex items-center justify-center rounded-xl bg-[#E8583A] text-white px-5 py-2.5 text-sm font-semibold hover:opacity-95 transition-opacity"
              >
                See how it works →
              </Link>
            </div>
            <p className="mt-3 text-sm text-white/45">Free to list · No lock-in · AI included</p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-[#140a25] min-h-[340px] sm:min-h-[380px] p-4 sm:p-5">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 420" aria-hidden>
              <line x1="300" y1="210" x2="110" y2="85" className="ai-dash" stroke="rgba(182,95,207,0.3)" strokeWidth="2" />
              <line x1="300" y1="210" x2="490" y2="85" className="ai-dash" stroke="rgba(232,88,58,0.3)" strokeWidth="2" />
              <line x1="300" y1="210" x2="110" y2="335" className="ai-dash" stroke="rgba(74,222,128,0.3)" strokeWidth="2" />
              <line x1="300" y1="210" x2="490" y2="335" className="ai-dash" stroke="rgba(182,95,207,0.25)" strokeWidth="2" />
              <circle cx="110" cy="85" r="6" fill="rgba(182,95,207,0.9)" className="ai-node" />
              <circle cx="490" cy="85" r="6" fill="rgba(232,88,58,0.9)" className="ai-node" />
              <circle cx="110" cy="335" r="6" fill="rgba(74,222,128,0.9)" className="ai-node" />
              <circle cx="490" cy="335" r="6" fill="rgba(182,95,207,0.85)" className="ai-node" />
            </svg>

            <div className="absolute left-1/2 top-1/2 h-28 w-28 sm:h-32 sm:w-32 -translate-x-1/2 -translate-y-1/2 ai-brain bg-[radial-gradient(circle_at_35%_30%,#B65FCF_0%,#7B2D9E_55%,#1A0B2E_100%)]" />

            <div className="ai-card absolute top-4 left-4 sm:top-5 sm:left-5 p-3 w-[42%] min-w-[152px]">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                <AiSparkleIcon className="h-3 w-3 shrink-0 text-[#E8583A]/90" />
                AI listing
              </p>
              <p className="mt-1 text-sm font-medium text-[#E8583A] ai-cursor">Writing your description</p>
            </div>

            <div className="ai-card ai-card-2 absolute top-4 right-4 sm:top-5 sm:right-5 p-3 w-[42%] min-w-[152px] text-right">
              <p className="ml-auto flex w-fit items-center justify-end gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                <AiSparkleIcon className="h-3 w-3 shrink-0 text-white/45" />
                Market price
              </p>
              <p className="mt-1 text-sm font-medium text-white">$280 - $320 /wk</p>
            </div>

            <div className="ai-card ai-card-3 absolute bottom-4 left-4 sm:bottom-5 sm:left-5 p-3 w-[42%] min-w-[152px]">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                <AiSparkleIcon className="h-3 w-3 shrink-0 text-[#4ade80]/80" />
                Enquiry reply
              </p>
              <p className="mt-1 text-sm font-medium text-[#4ade80]">✓ Sent in 3 seconds</p>
            </div>

            <div className="ai-card ai-card-4 absolute bottom-4 right-4 sm:bottom-5 sm:right-5 p-3 w-[42%] min-w-[152px] text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Data from</p>
              <p className="mt-1 text-sm font-medium text-[#D49EE8]">Flatmates · Scape · Iglu</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
