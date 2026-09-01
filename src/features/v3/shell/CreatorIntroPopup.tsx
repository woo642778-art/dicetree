import { useEffect, useState } from "react";

const STORAGE_KEY = "dicetree:creator-intro-seen:v1";

export function CreatorIntroPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setMounted(true);
        const frame = window.requestAnimationFrame(() => setOpen(true));
        return () => window.cancelAnimationFrame(frame);
      }
    } catch {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setOpen(true));
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, []);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => {
      setMounted(false);
      try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* optional preference */ }
    }, 220);
  };

  useEffect(() => {
    if (!mounted) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted]);

  if (!mounted) return null;

  return <div className={`creator-intro ${open ? "is-open" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="creator-intro-card" role="dialog" aria-modal="true" aria-labelledby="creator-intro-title">
      <button className="creator-intro-close" type="button" aria-label="닫기" onClick={close}>×</button>
      <div className="creator-intro-orb" aria-hidden="true"><span>RD</span><b>2</b></div>
      <small className="creator-intro-eyebrow">DICETREE · CREATOR</small>
      <h2 id="creator-intro-title">제작자 모님</h2>
      <p>랜덤 다이스 2의 다이스 트리와 각종 데이터를 더 편하게 연구할 수 있도록 만든 비공식 팬 도구입니다.</p>
      <div className="creator-intro-points" aria-label="사이트 특징">
        <span>다이스 트리 플래너</span>
        <span>재화 및 투자 계산</span>
        <span>덱 · 시뮬레이션 연구</span>
      </div>
      <a href="https://github.com/woo642778-art/dicetree" target="_blank" rel="noreferrer" className="creator-intro-github">GitHub에서 프로젝트 보기 <span>↗</span></a>
      <button className="creator-intro-primary" type="button" onClick={close}>DiceTree 시작하기</button>
      <small className="creator-intro-footnote">다음 방문부터는 이 안내를 다시 표시하지 않습니다.</small>
    </section>
  </div>;
}
