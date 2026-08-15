import type { DiceDefinition, DiceFamily, PlannerGoals, PlannerRole, SpendingProfile } from "../../domain/types";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  dice: DiceDefinition[];
  goals: PlannerGoals;
  onChange: (goals: PlannerGoals) => void;
  familyFilter: DiceFamily | "all";
  onFamilyFilter: (family: DiceFamily | "all") => void;
  search: string;
  onSearch: (value: string) => void;
  className?: string;
}

export function GoalPanel({ dice, goals, onChange, familyFilter, onFamilyFilter, search, onSearch, className }: Props) {
  const { t } = useI18n();
  const roles: PlannerRole[] = ["dealer", "support", "balanced"];
  const profiles: SpendingProfile[] = ["f2p", "light", "spender"];
  const families: Array<DiceFamily | "all"> = ["all", "order", "chaos", "magic", "engineering", "nature"];

  return (
    <aside className={`side-panel goal-panel ${className ?? ""}`}>
      <div className="panel-title"><span>{t("goal.title")}</span><span className="panel-index">01</span></div>
      <label className="field-label" htmlFor="tree-search">{t("tree.search")}</label>
      <input id="tree-search" className="text-input" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={t("tree.search")} />

      <div className="family-tabs" aria-label="Tree family filter">
        {families.map((family) => <button key={family} type="button" className={familyFilter === family ? "active" : ""} onClick={() => onFamilyFilter(family)}>{family === "all" ? t("tree.all") : t(`family.${family}`)}</button>)}
      </div>

      <label className="field-label" htmlFor="primary-die">{t("goal.primary")}</label>
      <select id="primary-die" className="select-input" value={goals.primaryDieId ?? ""} onChange={(e) => onChange({ ...goals, primaryDieId: e.target.value || undefined })}>
        <option value="">{t("dice.none")}</option>
        {dice.map((die) => <option value={die.id} key={die.id}>{t(die.localizationKey)} · {t(`family.${die.family}`)}</option>)}
      </select>

      <span className="field-label">{t("goal.secondary")}</span>
      <div className="check-list">
        {dice.map((die) => {
          const checked = goals.secondaryDieIds.includes(die.id);
          return <label key={die.id}><input type="checkbox" checked={checked} onChange={() => onChange({ ...goals, secondaryDieIds: checked ? goals.secondaryDieIds.filter((x) => x !== die.id) : [...goals.secondaryDieIds, die.id] })} /><span>{t(die.localizationKey)}</span></label>;
        })}
      </div>

      <span className="field-label">{t("goal.role")}</span>
      <div className="segmented">
        {roles.map((role) => <button type="button" key={role} className={goals.role === role ? "active" : ""} onClick={() => onChange({ ...goals, role })}>{t(`role.${role}`)}</button>)}
      </div>

      <span className="field-label">{t("goal.profile")}</span>
      <div className="profile-stack">
        {profiles.map((profile) => <button type="button" key={profile} className={goals.spendingProfile === profile ? "active" : ""} onClick={() => onChange({ ...goals, spendingProfile: profile })}><strong>{t(`profile.${profile}`)}</strong><small>{profile === "f2p" ? "VALUE / COST" : profile === "light" ? "BALANCED" : "MAX CEILING"}</small></button>)}
      </div>

      <label className="field-label" htmlFor="budget-gold">{t("goal.budget")}</label>
      <input id="budget-gold" className="text-input" type="number" min="0" step="1000" value={goals.budget?.gold ?? ""} onChange={(e) => onChange({ ...goals, budget: e.target.value ? { ...goals.budget, gold: Number(e.target.value) } : undefined })} placeholder="50,000" />
    </aside>
  );
}
