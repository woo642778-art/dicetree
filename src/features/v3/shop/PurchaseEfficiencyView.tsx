import { useMemo, useState } from "react";
import { OFFICIAL_APP_STORE_KR_URL, PURCHASE_PRODUCTS_V41, purchaseDisplayPrice, REFERENCE_KRW_PER_USD, type PurchaseGoal, type PurchaseProduct, type PurchaseProfile, type PurchaseRewards } from "../../../purchase-efficiency/products";
import { findIntroOffer, recommendPurchasesV41 } from "../../../purchase-efficiency/recommend";
import { optimizePurchaseBudgetV47 } from "../../../purchase-efficiency/optimizeBudget";

function rewardText(product: PurchaseProduct, locale: "ko" | "en") {
  const rewards = product.rewards;
  const values: string[] = [];
  if (rewards.gold) values.push(`${locale === "ko" ? "골드" : "Gold"} ${rewards.gold.toLocaleString()}`);
  if (rewards.core) values.push(`${locale === "ko" ? "코어" : "Core"} ${rewards.core.toLocaleString()}`);
  if (rewards.redesignItem) values.push(`${locale === "ko" ? "재설계 아이템" : "Redesign item"} ${rewards.redesignItem}`);
  if (rewards.diceSkin) values.push(`${locale === "ko" ? "주사위 스킨" : "Dice skin"} ${rewards.diceSkin}`);
  if (rewards.tickets) values.push(`${locale === "ko" ? "티켓" : "Tickets"} ${rewards.tickets}`);
  if (rewards.other) values.push(`${locale === "ko" ? "추가 보상" : "Other reward"} ${rewards.other}`);
  return values;
}

function Price({ product, locale }: { product: PurchaseProduct; locale: "ko" | "en" }) {
  const price = purchaseDisplayPrice(product, locale);
  return <div className="v41-price">
    {price.currency === "KRW"
      ? <><strong>₩{price.value.toLocaleString("ko-KR")}</strong><small>{price.basis === "official" ? "현재 한국 App Store 표시가" : "달러 기준가의 원화 환산 참고가"}</small></>
      : <><strong>${price.value.toFixed(2)}</strong><small>In-game USD reference price</small></>}
  </div>;
}

export function PurchaseEfficiencyView({ locale }: { locale: "ko" | "en" }) {
  const [profile, setProfile] = useState<PurchaseProfile>("light");
  const [goal, setGoal] = useState<PurchaseGoal>("overall");
  const [budgets, setBudgets] = useState({ ko: 30_000, en: 30 });
  const [currentCore, setCurrentCore] = useState(420);
  const [targetCore, setTargetCore] = useState(500);
  const [popupRewards, setPopupRewards] = useState<Record<string, PurchaseRewards>>({});
  const effectiveProducts = useMemo(() => PURCHASE_PRODUCTS_V41.map((product) => {
    const override = popupRewards[product.id];
    const hasOverride = override && Object.values(override).some((value) => (value ?? 0) > 0);
    return hasOverride ? { ...product, rewards: { ...product.rewards, ...override }, rewardEvidence: "verified" as const } : product;
  }), [popupRewards]);
  const optimizerProducts = useMemo(() => effectiveProducts.filter((product) => product.rewardEvidence !== "price-only"), [effectiveProducts]);
  const storefrontProducts = useMemo(() => effectiveProducts.filter((product) => ["trigger", "popup", "pass", "ticket"].includes(product.category)), [effectiveProducts]);
  const ranking = useMemo(() => recommendPurchasesV41(profile, goal, effectiveProducts), [effectiveProducts, goal, profile]);
  const intro = findIntroOffer(effectiveProducts);
  const top = ranking[0];
  const optimized = useMemo(() => optimizePurchaseBudgetV47({ locale, budget: budgets[locale], goal, currentCore, targetCore }, optimizerProducts), [budgets, currentCore, goal, locale, optimizerProducts, targetCore]);
  const money = (value: number) => locale === "ko" ? `₩${value.toLocaleString("ko-KR")}` : `$${value.toFixed(2)}`;
  const updatePopupReward = (productId: string, field: keyof PurchaseRewards, value: number) => setPopupRewards((current) => ({
    ...current,
    [productId]: { ...current[productId], [field]: Math.max(0, Math.floor(value || 0)) },
  }));

  return <main className="v41-shop" data-testid="v41-purchase-efficiency">
    <header className="v41-shop-hero">
      <div>
        <small>DICE TREE VALUE LAB</small>
        <h1>{locale === "ko" ? "내 과금에 맞는 구매 효율" : "Purchase value for your budget"}</h1>
        <p>{locale === "ko" ? "게임 내 패키지 효율과 실제 보상 구성을 분리해서 비교합니다." : "Compare in-game package efficiency separately from reward composition."}</p>
      </div>
      <aside className="v41-source-card" data-testid="v41-purchase-source">
        <strong>{locale === "ko" ? "데이터 기준" : "Data basis"}</strong>
        <span>{locale === "ko" ? "게임 내 상품 구성 · 패키지 효율 · 보상 정보" : "In-game product contents, package efficiency and rewards"}</span>
        <small>{locale === "ko" ? `원화 미노출 상품은 미국 달러 1단위당 ₩${REFERENCE_KRW_PER_USD.toLocaleString()} 고정 참고 환율 적용` : "English prices use the in-game USD reference only."}</small>
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
      <p>{locale === "ko" ? "효율 수치는 게임 내부의 패키지 효율 지표이며 할인율이나 수익률을 뜻하지 않습니다." : "The value is an in-game package-efficiency metric, not a discount or financial return."}</p>
    </section>

    <section className="v50-popup-catalog" data-testid="v50-popup-catalog">
      <header><div><small>{locale === "ko" ? "현재 App Store 노출 상품" : "CURRENT APP STORE LISTINGS"}</small><h2>{locale === "ko" ? "팝업·패스·티켓 상품" : "Popup, pass and ticket products"}</h2><p>{locale === "ko" ? "가격은 현재 목록을 반영했습니다. 보상 구성이 확인되지 않은 팝업은 게임에 보이는 수량을 입력해야 효율 계산에 포함됩니다." : "Current listed prices are included. Enter the visible in-game rewards for price-only popups before they enter the optimizer."}</p></div><a href={OFFICIAL_APP_STORE_KR_URL} target="_blank" rel="noreferrer">{locale === "ko" ? "가격 원문" : "Price source"}</a></header>
      <div className="v50-popup-grid">
        {storefrontProducts.map((product) => {
          const configurable = PURCHASE_PRODUCTS_V41.find((candidate) => candidate.id === product.id)?.rewardEvidence === "price-only";
          return <article key={product.id} data-testid={`v50-popup-${product.id}`}>
            <div className="v50-popup-title"><span>{product.category.toUpperCase()}</span><h3>{product.nameKo}</h3><code>{product.id}</code></div>
            <Price product={product} locale={locale} />
            {configurable ? <fieldset><legend>{locale === "ko" ? "게임에 표시된 보상 입력" : "Enter visible in-game rewards"}</legend>
              {(["gold", "core", "redesignItem", "other"] as const).map((field) => <label key={field}>{field === "gold" ? (locale === "ko" ? "골드" : "Gold") : field === "core" ? (locale === "ko" ? "코어" : "Core") : field === "redesignItem" ? (locale === "ko" ? "재설계" : "Redesign") : (locale === "ko" ? "기타 가치" : "Other value")}<input aria-label={`${product.id} ${field}`} type="number" min="0" value={popupRewards[product.id]?.[field] ?? 0} onChange={(event) => updatePopupReward(product.id, field, Number(event.target.value))} /></label>)}
              <small>{locale === "ko" ? "보상 1개 이상 입력 시 예산 최적화에 자동 포함" : "Automatically included once any reward is entered"}</small>
            </fieldset> : <div className="v41-rewards">{rewardText(product, locale).map((reward) => <span key={reward}>{reward}</span>)}</div>}
          </article>;
        })}
      </div>
    </section>

    <section className="v47-budget-optimizer" data-testid="v47-budget-optimizer">
      <header><div><small>{locale === "ko" ? "배낭 최적화 · 상품별 1회" : "KNAPSACK OPTIMIZATION · ONE OF EACH"}</small><h2>{locale === "ko" ? "예산으로 최적 과금 조합 찾기" : "Best package combination for a budget"}</h2><p>{locale === "ko" ? "예산 안의 모든 상품 조합을 계산해 목표 코어까지의 부족분과 낭비를 최소화합니다." : "Evaluates every package combination under budget to minimize target shortfall and waste."}</p></div><strong>{optimized.evaluatedCombinations.toLocaleString()}<span>{locale === "ko" ? "개 조합 검토" : " combinations"}</span></strong></header>
      <div className="v47-budget-inputs">
        <label>{locale === "ko" ? "최대 예산" : "Maximum budget"}<input aria-label={locale === "ko" ? "최대 예산" : "Maximum budget"} type="number" min="0" value={budgets[locale]} onChange={(event) => setBudgets((current) => ({ ...current, [locale]: Math.max(0, Number(event.target.value) || 0) }))} /></label>
        <label>{locale === "ko" ? "현재 코어" : "Current Core"}<input aria-label={locale === "ko" ? "현재 코어" : "Current Core"} type="number" min="0" value={currentCore} onChange={(event) => setCurrentCore(Math.max(0, Number(event.target.value) || 0))} /></label>
        <label>{locale === "ko" ? "목표 코어" : "Target Core"}<input aria-label={locale === "ko" ? "목표 코어" : "Target Core"} type="number" min="0" value={targetCore} onChange={(event) => setTargetCore(Math.max(0, Number(event.target.value) || 0))} /></label>
      </div>
      <div className="v47-budget-result">
        <div className="v47-combo-summary"><small>{optimized.reachesTarget ? (locale === "ko" ? "목표 도달 최소 낭비 조합" : "Target-reaching minimum-waste combination") : (locale === "ko" ? "예산 내 목표에 가장 가까운 조합" : "Closest combination under budget")}</small><strong>{money(optimized.spent)}</strong><p>{locale === "ko" ? `잔액 ${money(optimized.remainingBudget)} · 코어 ${optimized.rewards.core.toLocaleString()} · 골드 ${optimized.rewards.gold.toLocaleString()}` : `Remaining ${money(optimized.remainingBudget)} · Core ${optimized.rewards.core.toLocaleString()} · Gold ${optimized.rewards.gold.toLocaleString()}`}</p><b className={optimized.reachesTarget ? "is-reached" : "is-short"}>{optimized.reachesTarget ? (locale === "ko" ? `목표 도달 · 잉여 코어 ${optimized.coreWaste}` : `Target reached · ${optimized.coreWaste} extra Core`) : (locale === "ko" ? `목표까지 코어 ${optimized.coreShortfall} 부족` : `${optimized.coreShortfall} Core short`)}</b></div>
        <ol>{optimized.products.length ? optimized.products.map((product) => <li key={product.id}><span>{product.nameKo}</span><strong>{money(purchaseDisplayPrice(product, locale).value)}</strong><small>{rewardText(product, locale).join(" · ")}</small></li>) : <li><span>{locale === "ko" ? "예산 안에 포함 가능한 상품이 없습니다." : "No listed package fits the budget."}</span></li>}</ol>
      </div>
      {optimized.nextUpgrade && <footer>{locale === "ko" ? `${money(optimized.nextUpgrade.extraSpend)}를 더 쓰면 목표 가중 가치 지수가 ${optimized.nextUpgrade.valueGain.toLocaleString()} 상승하는 다음 조합이 있습니다.` : `The next higher-value combination costs ${money(optimized.nextUpgrade.extraSpend)} more and adds ${optimized.nextUpgrade.valueGain.toLocaleString()} weighted-value points.`}</footer>}
      <p className="v47-budget-limit">{locale === "ko" ? "판매 횟수와 실시간 노출 여부는 확인할 수 없어 각 상품을 최대 1개로 계산합니다. 사이트에서 결제는 이루어지지 않습니다." : "Availability limits are not live, so each listed package is capped at one. No purchase occurs on this site."}</p>
    </section>

    {top && <section className="v41-top-pick" data-testid="v41-top-pick">
      <div className="v41-pick-rank">01</div>
      <div>
        <small>{profile === "light" ? (locale === "ko" ? "소과금 추천" : "Light-spender pick") : (locale === "ko" ? "과금 추천" : "Invested pick")}</small>
        <h2>{top.nameKo}</h2>
        <div className="v41-rewards">{rewardText(top, locale).map((reward) => <span key={reward}>{reward}</span>)}</div>
      </div>
      <div className="v41-efficiency"><small>{locale === "ko" ? "패키지 효율" : "Package efficiency"}</small><strong>{top.clientEfficiency}</strong></div>
      <Price product={top} locale={locale} />
    </section>}

    <section className="v41-ranking" aria-label={locale === "ko" ? "패키지 효율 순위" : "Package value ranking"}>
      {ranking.slice(0, 5).map((product, index) => <article key={product.id} data-testid={`v41-package-${product.id}`}>
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div><h3>{product.nameKo}</h3><div className="v41-rewards">{rewardText(product, locale).map((reward) => <span key={reward}>{reward}</span>)}</div></div>
        <div className="v41-efficiency"><small>{locale === "ko" ? "효율" : "Efficiency"}</small><strong>{product.clientEfficiency}</strong></div>
        <Price product={product} locale={locale} />
      </article>)}
    </section>

    {intro && <section className="v41-intro-offer" data-testid="v41-intro-offer">
      <div><small>{locale === "ko" ? "별도 비교" : "Separate comparison"}</small><h2>{locale === "ko" ? "최소 진입 비용" : "Lowest entry price"}</h2><p>{intro.nameKo} · {rewardText(intro, locale).join(" · ")}</p></div>
      <Price product={intro} locale={locale} />
      <p>{locale === "ko" ? "이 상품에는 패키지 효율 지표가 없어 위 순위에 섞지 않았습니다." : "This offer has no package-efficiency metric, so it is excluded from the ranking."}</p>
    </section>}

    <footer>{locale === "ko" ? "구매는 사이트에서 이루어지지 않습니다. 가격과 판매 여부는 변경될 수 있으므로 결제 전 게임과 App Store에서 최종 확인하세요." : "No purchase occurs on this site. Confirm current availability and price in-game and in the App Store before paying."}</footer>
  </main>;
}
