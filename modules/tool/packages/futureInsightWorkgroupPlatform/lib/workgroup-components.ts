import { escapeHtml } from './escape';

export type WorkgroupTone = 'charcoal' | 'fog' | 'butter' | 'yellow' | 'coral' | 'stone';

export type WorkgroupChartCard = {
  title: string;
  subtitle?: string;
  body: string;
  note?: string;
  dark?: boolean;
};

export type WorkgroupKpiItem = {
  label: string;
  value: string | number;
  tone?: WorkgroupTone;
};

export type WorkgroupBarItem = {
  label: string;
  value: number;
  tone?: WorkgroupTone;
};

export type WorkgroupRelationshipNode = {
  id: string;
  title: string;
  meta?: string;
  role?: 'target' | 'person' | 'company' | 'product' | 'channel';
  tone?: WorkgroupTone;
};

export type WorkgroupEcosystemColumn = {
  title: string;
  items: Array<{ label: string; tone?: WorkgroupTone }>;
  core?: boolean;
};

const toneClass = (tone: WorkgroupTone = 'charcoal') => `wg-tone-${tone}`;

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function renderWorkgroupBaseCss(): string {
  return `
    :root {
      color-scheme: light;
      --wg-paper: #f6f4f1;
      --wg-paper-strong: #fdfcf3;
      --wg-ink: #282823;
      --wg-muted: #646661;
      --wg-line: #e4ded2;
      --wg-stone: #e4ded2;
      --wg-coral: #f95c4b;
      --wg-yellow: #ffd63d;
      --wg-butter: #e9be5f;
      --wg-fog: #595c56;
      --wg-cream: #fff9ec;
      --wg-butter-soft: #f5e8b6;
      --wg-coral-soft: #f7c8be;
      --wg-fog-soft: #d8d8cf;
      --paper: var(--wg-paper);
      --paper-strong: var(--wg-paper-strong);
      --ink: var(--wg-ink);
      --muted: var(--wg-muted);
      --line: var(--wg-line);
      --dark: var(--wg-ink);
      --orange: var(--wg-coral);
      --lime: var(--wg-yellow);
      --blue: var(--wg-fog);
      --cyan: var(--wg-butter);
      --shadow: none;
    }
  `;
}

export function renderWorkgroupComponentCss(): string {
  return `
    .wg-card {
      min-width: 0;
      background: var(--wg-paper-strong);
      border: 1px solid rgb(21 17 13 / 72%);
      padding: 20px;
    }
    .wg-card.dark {
      background: var(--wg-ink);
      border-color: var(--wg-ink);
      color: var(--wg-cream);
    }
    .wg-top {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: start;
      border-bottom: 1px solid rgb(21 17 13 / 28%);
      padding-bottom: 13px;
      margin-bottom: 16px;
    }
    .wg-top h3 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      line-height: 1;
    }
    .wg-top p {
      max-width: 320px;
      margin: 0;
      color: var(--wg-muted);
      font-size: 12px;
      line-height: 1.45;
      text-align: right;
    }
    .wg-card.dark .wg-top p { color: rgb(255 249 236 / 66%); }
    .wg-note {
      margin: 12px 0 0;
      color: var(--wg-muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .wg-card.dark .wg-note { color: rgb(255 249 236 / 68%); }
    .wg-kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border-top: 1px solid var(--wg-line);
      border-left: 1px solid var(--wg-line);
      background: var(--wg-paper-strong);
    }
    .wg-kpi {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: end;
      min-width: 0;
      padding: 16px;
      border-right: 1px solid var(--wg-line);
      border-bottom: 1px solid var(--wg-line);
    }
    .wg-kpi b {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 38px;
      line-height: .9;
    }
    .wg-kpi span {
      color: var(--wg-muted);
      font-size: 10px;
      font-weight: 900;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .wg-tone-charcoal b, .wg-fill-charcoal { color: var(--wg-ink); background: var(--wg-ink); }
    .wg-tone-fog b, .wg-fill-fog { color: var(--wg-fog); background: var(--wg-fog); }
    .wg-tone-butter b, .wg-fill-butter { color: #b88a20; background: var(--wg-butter); }
    .wg-tone-yellow b, .wg-fill-yellow { color: #8d6f00; background: var(--wg-yellow); }
    .wg-tone-coral b, .wg-fill-coral { color: var(--wg-coral); background: var(--wg-coral); }
    .wg-bars {
      display: grid;
      gap: 12px;
    }
    .wg-bar-row {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr) 44px;
      gap: 10px;
      align-items: center;
      color: var(--wg-muted);
      font-size: 12px;
    }
    .wg-bar-row strong { color: var(--wg-ink); font-size: 13px; }
    .wg-bar-track {
      height: 16px;
      border: 1px solid rgb(21 17 13 / 42%);
      background: var(--wg-stone);
      overflow: hidden;
    }
    .wg-bar-track i { display: block; height: 100%; }
    .wg-bar-row b {
      color: var(--wg-ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 18px;
      line-height: 1;
      text-align: right;
    }
    .wg-relation {
      position: relative;
      min-height: 420px;
      border: 1px solid rgb(21 17 13 / 48%);
      background: var(--wg-paper);
      overflow: hidden;
    }
    .wg-rnode {
      position: absolute;
      width: 170px;
      border: 1px solid rgb(21 17 13 / 52%);
      background: var(--wg-paper-strong);
      padding: 12px;
      z-index: 2;
    }
    .wg-rnode strong { display: block; font-size: 15px; line-height: 1.2; }
    .wg-rnode span {
      display: block;
      margin-top: 6px;
      color: var(--wg-muted);
      font-size: 10px;
      font-weight: 900;
      line-height: 1.25;
      text-transform: uppercase;
    }
    .wg-rnode.target {
      left: 50%;
      top: 48%;
      transform: translate(-50%, -50%);
      background: var(--wg-ink);
      color: var(--wg-cream);
    }
    .wg-rnode.target span { color: rgb(255 249 236 / 72%); }
    .wg-rnode.person { left: 7%; top: 12%; border-top: 10px solid var(--wg-butter); }
    .wg-rnode.company { right: 7%; top: 12%; border-top: 10px solid var(--wg-fog); }
    .wg-rnode.product { left: 8%; bottom: 12%; border-top: 10px solid var(--wg-yellow); }
    .wg-rnode.channel { right: 8%; bottom: 12%; border-top: 10px solid var(--wg-coral); }
    .wg-rline {
      position: absolute;
      left: 50%;
      top: 48%;
      width: 34%;
      height: 2px;
      background: var(--wg-ink);
      transform-origin: left center;
      z-index: 1;
    }
    .wg-rline.one { transform: rotate(-145deg); }
    .wg-rline.two { transform: rotate(-35deg); }
    .wg-rline.three { transform: rotate(145deg); }
    .wg-rline.four { transform: rotate(35deg); }
    .wg-ecosystem {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      border-top: 1px solid rgb(21 17 13 / 48%);
      border-left: 1px solid rgb(21 17 13 / 48%);
      background: var(--wg-paper-strong);
    }
    .wg-eco-col {
      min-width: 0;
      min-height: 250px;
      padding: 14px;
      border-right: 1px solid rgb(21 17 13 / 48%);
      border-bottom: 1px solid rgb(21 17 13 / 48%);
      display: grid;
      align-content: start;
      gap: 10px;
    }
    .wg-eco-col > b {
      color: var(--wg-muted);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .wg-eco-col.core {
      background: var(--wg-ink);
      color: var(--wg-cream);
    }
    .wg-eco-col.core > b { color: rgb(255 249 236 / 72%); }
    .wg-eco-item {
      border: 1px solid rgb(21 17 13 / 36%);
      background: var(--wg-paper-strong);
      padding: 10px;
      min-height: 58px;
      display: grid;
      align-content: center;
      font-size: 13px;
      font-weight: 850;
      line-height: 1.25;
    }
    .wg-eco-col.core .wg-eco-item {
      background: #383932;
      color: var(--wg-cream);
      border-color: rgb(255 249 236 / 26%);
    }
    .wg-eco-item.wg-tone-fog { border-left: 10px solid var(--wg-fog); }
    .wg-eco-item.wg-tone-butter { border-left: 10px solid var(--wg-butter); }
    .wg-eco-item.wg-tone-yellow { border-left: 10px solid var(--wg-yellow); }
    .wg-eco-item.wg-tone-coral { border-left: 10px solid var(--wg-coral); }
    @media (max-width: 1100px) {
      .wg-ecosystem { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 700px) {
      .wg-top { display: grid; }
      .wg-top p { max-width: none; text-align: left; }
      .wg-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .wg-relation { min-height: 0; display: grid; gap: 10px; padding: 12px; }
      .wg-relation .wg-rnode { position: relative; inset: auto !important; width: 100%; transform: none; }
      .wg-relation .wg-rline { display: none; }
      .wg-ecosystem { grid-template-columns: 1fr; }
      .wg-eco-col { min-height: auto; }
    }
    @media (max-width: 420px) {
      .wg-kpi-strip { grid-template-columns: 1fr; }
      .wg-bar-row { grid-template-columns: 86px minmax(0, 1fr) 38px; }
    }
  `;
}

export function renderWorkgroupCard(card: WorkgroupChartCard): string {
  return `<article class="${card.dark ? 'wg-card dark' : 'wg-card'}">
    <div class="wg-top">
      <h3>${escapeHtml(card.title)}</h3>
      ${card.subtitle ? `<p>${escapeHtml(card.subtitle)}</p>` : ''}
    </div>
    ${card.body}
    ${card.note ? `<p class="wg-note">${escapeHtml(card.note)}</p>` : ''}
  </article>`;
}

export function renderWorkgroupKpiStrip(items: WorkgroupKpiItem[]): string {
  return `<div class="wg-kpi-strip">
    ${items
      .slice(0, 8)
      .map(
        (item) => `<div class="wg-kpi ${toneClass(item.tone)}">
          <b>${escapeHtml(item.value)}</b>
          <span>${escapeHtml(item.label)}</span>
        </div>`
      )
      .join('')}
  </div>`;
}

export function renderWorkgroupBars(items: WorkgroupBarItem[]): string {
  return `<div class="wg-bars">
    ${items
      .slice(0, 8)
      .map(
        (item) => `<div class="wg-bar-row">
          <strong>${escapeHtml(item.label)}</strong>
          <div class="wg-bar-track"><i class="wg-fill-${item.tone || 'coral'}" style="width:${clampPercent(
            item.value
          )}%;"></i></div>
          <b>${clampPercent(item.value)}</b>
        </div>`
      )
      .join('')}
  </div>`;
}

export function renderWorkgroupRelationshipGraph(nodes: WorkgroupRelationshipNode[]): string {
  const roles: Array<NonNullable<WorkgroupRelationshipNode['role']>> = [
    'target',
    'person',
    'company',
    'product',
    'channel'
  ];
  const normalized = roles
    .map((role) => nodes.find((node) => node.role === role))
    .filter((node): node is WorkgroupRelationshipNode => Boolean(node));

  return `<div class="wg-relation">
    <i class="wg-rline one"></i>
    <i class="wg-rline two"></i>
    <i class="wg-rline three"></i>
    <i class="wg-rline four"></i>
    ${normalized
      .map(
        (node) => `<div class="wg-rnode ${escapeHtml(node.role || '')}">
          <strong>${escapeHtml(node.title)}</strong>
          ${node.meta ? `<span>${escapeHtml(node.meta)}</span>` : ''}
        </div>`
      )
      .join('')}
  </div>`;
}

export function renderWorkgroupEcosystemMap(columns: WorkgroupEcosystemColumn[]): string {
  return `<div class="wg-ecosystem">
    ${columns
      .slice(0, 6)
      .map(
        (column) => `<div class="${column.core ? 'wg-eco-col core' : 'wg-eco-col'}">
          <b>${escapeHtml(column.title)}</b>
          ${column.items
            .slice(0, 5)
            .map(
              (item) =>
                `<div class="wg-eco-item ${toneClass(item.tone)}">${escapeHtml(item.label)}</div>`
            )
            .join('')}
        </div>`
      )
      .join('')}
  </div>`;
}
