import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--offwhite)' }}>
      <div className="py-5 px-10 border-b flex items-center" style={{ borderColor: 'var(--border-light)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://hkr.team/hubfs/Navy(spread)_vector.svg" alt="HKR.TEAM" className="h-[26px]" />
      </div>
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="anim-up bg-white rounded-[14px] border shadow-sm max-w-[560px] w-full text-center py-[52px] px-12" style={{ borderColor: 'var(--border-light)' }}>
          <h1 className="text-[28px] mb-2" style={{ color: 'var(--navy)', fontFamily: "'DM Serif Display', serif" }}>Assessment Platform</h1>
          <p className="text-[15px] leading-relaxed mb-9" style={{ color: 'var(--text-sec)' }}>Choose how you&apos;d like to access the platform</p>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/dashboard" className="no-underline">
              <div className="p-8 rounded-[14px] border-2 bg-white text-center transition-all duration-200 hover:border-[var(--navy)] hover:bg-[var(--tusk)] hover:-translate-y-0.5 cursor-pointer" style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-[32px] mb-3">&#9881;&#65039;</div>
                <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--navy)' }}>Admin Panel</div>
                <div className="text-[13px] leading-snug" style={{ color: 'var(--text-mut)' }}>Create assessments, view results, manage users</div>
              </div>
            </Link>
            <Link href="/assess/tok_maria_english" className="no-underline">
              <div className="p-8 rounded-[14px] border-2 bg-white text-center transition-all duration-200 hover:border-[var(--navy)] hover:bg-[var(--tusk)] hover:-translate-y-0.5 cursor-pointer" style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-[32px] mb-3">&#128221;</div>
                <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--navy)' }}>Take Assessment</div>
                <div className="text-[13px] leading-snug" style={{ color: 'var(--text-mut)' }}>Preview the candidate experience</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
