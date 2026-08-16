import { useMemo, useState } from "react";
import { OFFICIAL_APP_STORE_KR_URL, type PurchaseGoal, type PurchaseProduct, type PurchaseProfile } from "../../../purchase-efficiency/products";
import { findIntroOffer, recommendPurchasesV41 } from "../../../purchase-efficiency/recommend";

function rewardText(product: PurchaseProduct, locale: "ko" | "en") {
  const rewards = product.rewards;
  const values: string[] = [];
  if (rewards.gold) values.push(`${locale === "ko" ? "골드" : "Gold"} ${rewards.gold.toLocaleString()}`);
  if (rewards.core) values.push(`${locale === "ko" ? "코어" : "Core"} ${rewards.core.toLocaleString()}`);
  if (rewards.redesignItem) values.push(`${locale === "ko" ? "재설계 아이템" : "Redesign item"} ${rewards.redesignItem}`);
  if (rewards.diceSkin) values.push(`${locale === "ko" ? "주사위 스킨" : "Dice skin"} ${rewards.diceSkin}`);
  if (rewards.other) values.push(`${locale === "ko" ? "추가 보상" : "Other reward"} ${rewards.other}`);
  return values;
}

function Price({ product, locale }: { product: PurchaseProduct; locale: "ko" | "en" }) {
  return <div className="v41-price">
    {product.officialKrw
      ? <><strong>₩{product.officialKrw.toLocaleString()}</strong><small>{locale === "ko" ? "현재 한국 App Store 표시가" : "Current Korean App Store price"}</small></>
      : <><strong>${product.priceUsd.toFixed(2)}</strong><small>{locale === "ko" ? "IPA 상품표 기준가" : "IPA table price"}</small></>}
  </div>;
}

export function PurchaseEfficiencyView({ locale }: { locale: "ko" | "en" }) {
  const [profile, setProfile] = useState<PurchaseProfile>("light");
  const [goal, setGoal] = useState<PurchaseGoal>("overall");
  const ranking = useMemo(() => recommendPurchasesV41(profile, goal), [goal, profile]);
  const intro = findIntroOffer();
  const top = ranking[0];

  return <main className="v41-shop" data-testid="v41-purchase-efficiency">
    <header className="v41-shop-hero">
      <div>
        <small>DICE TREE VALUE LAB / CLIENT 1.0.1</small>
        <h1>{locale === "ko" ? "내 과금에 맞는 구매 효율" : "Purchase value for your budget"}</h1>
        <p>{locale === "ko" ? "게임 클라이언트가 선언한 패키지 효율과 실제 보상 구성을 분리해서 비교합니다." : "Compare client-declared package efficiency separately from reward composition."}</p>
      </div>
      <aside className="v41-source-card" data-testid="v41-purchase-source">
        <strong>{locale === "ko" ? "근거 상태" : "Evidence"}</strong>
        <span>IPA 1.0.1 · ShopProductTable · SpecialPackageTable · RewardTable</span>
        <a href={OFFICIAL_APP_STORE_KR_URL} target="_blank" rel="noreferrer">{locale === "ko" ? "한국 App Store 가격 확인" : "Check Korean App Store prices"}</a>
      </aside>
    </header>

    <section className="v41-shop-controls" aria-label={locale === "ko" ? "구매 추천 조건" : "Purchase recommendation controls"}>
      <label>{locale === "ko" ? "과금 성향" : "Spending profile"}
        <select aria-label={locale === "ko" ? "과금 성향" : "Spending profile"} value={profile} onChange={(event) => setProfile(event.target.value as PurchaseProfile)}>
          <option value="light">{locale === "ko" ? "소과금" : "Light spender"}</option>
          <option value="invested">{locale === "ko" ? "과금" : "Invested"}</option>
        </select>
      </label>
      <label>{locale === "ko" ? "우선 목표" : "Priority"}
        <select aria-label={locale === "ko" ? "우선 목표" : "Priority"} value={goal} onChange={(event) => setGoal(event.target.value as PurchaseGoal)}>
          <option value="overall">{locale === "ko" ? "종합 효율" : "Overall value"}</option>
          <option value="core">{locale === "ko" ? "다이스 코어" : "Dice Core"}</option>
          <option value="gold">{locale === "ko" ? "골드" : "Gold"}</option>
          <option value="redesign">{locale === "ko" ? "트리 재설계" : "Tree redesign"}</option>
        </select>
      </label>
      <p>{locale === "ko" ? "효율 수치는 게임 클라이언트의 Efficiency 필드이며 할인율이나 수익률을 뜻하지 않습니다." : "Efficiency is a client data field, not a discount or financial return."}</p>
    </section>

    {top && <section className="v41-top-pick" data-testid="v41-top-pick">
      <div className="v41-pick-rank">01</div>
      <div>
        <small>{profile === "light" ? (locale === "ko" ? "소과금 추천" : "Light-spender pick") : (locale === "ko" ? "과금 추천" : "Invested pick")}</small>
        <h2>{top.nameKo}</h2>
        <div className="v41-rewards">{rewardText(top, locale).map((reward) => <span key={reward}>{reward}</span>)}</div>
      </div>
      <div className="v41-efficiency"><small>{locale === "ko" ? "클라이언트 효율" : "Client efficiency"}</small><strong>{top.clientEfficiency}</strong></div>
      <Price product={top} locale={locale} />
    </section>}

    <section className="v41-ranking" aria-label={locale === "ko" ? "패키지 효율 순위" : "Package value ranking"}>
      {ranking.slice(0, 5).map((product, index) => <article key={product.id} data-testid={`v41-package-${product.id}`}>
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div><small>{product.id}</small><h3>{product.nameKo}</h3><div className="v41-rewards">{rewardText(product, locale).map((reward) => <span key={reward}>{reward}</span>)}</div></div>
        <div className="v41-efficiency"><small>{locale === "ko" ? "효율" : "Efficiency"}</small><strong>{product.clientEfficiency}</strong></div>
        <Price product={product} locale={locale} />
      </article>)}
    </section>

    {intro && <section className="v41-intro-offer" data-testid="v41-intro-offer">
      <div><small>{locale === "ko" ? "별도 비교" : "Separate comparison"}</small><h2>{locale === "ko" ? "최소 진입 비용" : "Lowest entry price"}</h2><p>{intro.nameKo} · {rewardText(intro, locale).join(" · ")}</p></div>
      <Price product={intro} locale={locale} />
      <p>{locale === "ko" ? "이 상품에는 Efficiency 값이 없어 위 순위에 섞지 않았습니다." : "This offer has no Efficiency value, so it is excluded from the ranking."}</p>
    </section>}

    <footer>{locale === "ko" ? "구매는 사이트에서 이루어지지 않습니다. 가격과 판매 여부는 변경될 수 있으므로 결제 전 게임과 App Store에서 최종 확인하세요." : "No purchase occurs on this site. Confirm current availability and price in-game and in the App Store before paying."}</footer>
  </main>;
}
