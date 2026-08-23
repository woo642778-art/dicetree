import { useEffect, useMemo, useState } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import { parseAccountScreenshotTextV52, type ScreenshotAccountDraftV52 } from "../../../account/screenshotImportV52";

export function ScreenshotAccountImportV52({ data, locale, onApply }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  onApply: (draft: ScreenshotAccountDraftV52) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<ScreenshotAccountDraftV52>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>();
  const [confirmed, setConfirmed] = useState(false);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  const recognize = async () => {
    if (!files.length) return;
    setStatus(locale === "ko" ? "문자 인식 엔진 준비 중" : "Preparing OCR");
    setProgress(0);
    setConfirmed(false);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["kor", "eng"], undefined, {
        logger: (message) => {
          if (typeof message.progress === "number") setProgress(Math.round(message.progress * 100));
          setStatus(message.status);
        },
      });
      const texts: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        setStatus(`${locale === "ko" ? "이미지 분석" : "Analyzing image"} ${index + 1}/${files.length}`);
        const result = await worker.recognize(files[index]);
        texts.push(result.data.text);
      }
      await worker.terminate();
      setDraft(parseAccountScreenshotTextV52(texts.join("\n"), data));
      setProgress(100);
      setStatus(locale === "ko" ? "인식 완료. 적용 전 확인이 필요합니다." : "Recognition complete. Review before applying.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return <article className="v52-screenshot-import" data-testid="v52-screenshot-import">
    <header><div><small>LOCAL OCR · SCREENSHOT IMPORT</small><h3>{locale === "ko" ? "게임 스크린샷으로 계정 자동 입력" : "Import account from screenshots"}</h3></div><b>{draft ? `${Math.round(draft.confidence * 100)}%` : "OCR"}</b></header>
    <p>{locale === "ko" ? "다이스 트리, 보유 재화, 주사위 레벨 화면을 여러 장 선택하세요. 이미지는 브라우저 안에서 인식되며 서버로 전송하지 않습니다." : "Choose multiple tree, resource, and dice-level screenshots. Images are recognized in the browser and are not uploaded."}</p>
    <input aria-label={locale === "ko" ? "계정 스크린샷" : "Account screenshots"} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { setFiles([...event.target.files ?? []].slice(0, 12)); setDraft(undefined); }} />
    {previews.length > 0 && <div className="v52-shot-previews">{previews.map(({ file, url }) => <img key={`${file.name}:${file.lastModified}`} src={url} alt={file.name} />)}</div>}
    <button type="button" disabled={!files.length} onClick={() => void recognize()}>{locale === "ko" ? `${files.length}장 분석` : `Analyze ${files.length} images`}</button>
    {status && <div className="v52-ocr-progress" role="status"><i><b style={{ width: `${progress}%` }} /></i><span>{status}</span></div>}
    {draft && <section className="v52-shot-review">
      <label>{locale === "ko" ? "골드" : "Gold"}<input type="number" min="0" value={draft.gold ?? 0} onChange={(event) => setDraft({ ...draft, gold: Math.max(0, Number(event.target.value) || 0) })} /></label>
      <label>{locale === "ko" ? "다이스 코어" : "Dice Core"}<input type="number" min="0" value={draft.stone ?? 0} onChange={(event) => setDraft({ ...draft, stone: Math.max(0, Number(event.target.value) || 0) })} /></label>
      <dl><div><dt>{locale === "ko" ? "인식 주사위 레벨" : "Dice levels"}</dt><dd>{Object.keys(draft.diceLevels).length}</dd></div><div><dt>{locale === "ko" ? "인식 노드 랭크" : "Node ranks"}</dt><dd>{Object.keys(draft.nodeRanks).length}</dd></div></dl>
      <details><summary>{locale === "ko" ? "인식 원문과 검토 항목" : "OCR text and review flags"}</summary><pre>{draft.rawText}</pre><p>{draft.review.join(" · ") || (locale === "ko" ? "직접 라벨 인식" : "Direct label recognition")}</p></details>
      <label className="v52-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{locale === "ko" ? "표시된 골드·코어와 인식 항목을 확인했습니다." : "I reviewed the resources and detected items."}</label>
      <button type="button" disabled={!confirmed} onClick={() => onApply(draft)}>{locale === "ko" ? "확인한 항목 계정에 적용" : "Apply reviewed items"}</button>
    </section>}
  </article>;
}
