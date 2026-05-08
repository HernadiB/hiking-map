export type ThemePalette = {
  background: string;
  panel: string;
  panelRaised: string;
  inputBackground: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  sand: string;
  sandText: string;
  routeBase: string;
  routeBaseSoft: string;
  highlight: string;
  highlightSoft: string;
  highlightText: string;
  success: string;
  error: string;
  warning: string;
  chartClimb: string;
  chartDescent: string;
  chartRolling: string;
  chartFlat: string;
};

export const lightPalette: ThemePalette = {
  background: '#E5ECDC',
  panel: '#F6F9F1',
  panelRaised: '#ECF3E4',
  inputBackground: '#E6EEDF',
  border: '#C4D1BE',
  text: '#203126',
  textMuted: '#60705E',
  accent: '#3A6245',
  accentStrong: '#2F6B46',
  sand: '#5D7E4D',
  sandText: '#F4FAF1',
  routeBase: '#4F8A5B',
  routeBaseSoft: '#B7D7BD',
  highlight: '#C9792E',
  highlightSoft: '#F1D7BB',
  highlightText: '#5E3813',
  success: '#4B875A',
  error: '#A95A3C',
  warning: '#9C7432',
  chartClimb: '#D85C27',
  chartDescent: '#2F6FDB',
  chartRolling: '#B46BD6',
  chartFlat: '#6F7782',
};

export const darkPalette: ThemePalette = {
  background: '#0E1511',
  panel: '#162119',
  panelRaised: '#1D2A21',
  inputBackground: '#223127',
  border: '#34483B',
  text: '#F3F8EF',
  textMuted: '#AEBBAB',
  accent: '#9BC78C',
  accentStrong: '#B4D9A7',
  sand: '#D1A767',
  sandText: '#11180F',
  routeBase: '#7FBE83',
  routeBaseSoft: '#355D3E',
  highlight: '#F59A3D',
  highlightSoft: '#5F3D21',
  highlightText: '#FFE6C7',
  success: '#88C792',
  error: '#F08E73',
  warning: '#E3B765',
  chartClimb: '#F37A45',
  chartDescent: '#6EA4FF',
  chartRolling: '#D18BEB',
  chartFlat: '#AAB3BF',
};

export const palette: ThemePalette = {
  background: `var(--hm-background, ${lightPalette.background})`,
  panel: `var(--hm-panel, ${lightPalette.panel})`,
  panelRaised: `var(--hm-panel-raised, ${lightPalette.panelRaised})`,
  inputBackground: `var(--hm-input-background, ${lightPalette.inputBackground})`,
  border: `var(--hm-border, ${lightPalette.border})`,
  text: `var(--hm-text, ${lightPalette.text})`,
  textMuted: `var(--hm-text-muted, ${lightPalette.textMuted})`,
  accent: `var(--hm-accent, ${lightPalette.accent})`,
  accentStrong: `var(--hm-accent-strong, ${lightPalette.accentStrong})`,
  sand: `var(--hm-sand, ${lightPalette.sand})`,
  sandText: `var(--hm-sand-text, ${lightPalette.sandText})`,
  routeBase: `var(--hm-route-base, ${lightPalette.routeBase})`,
  routeBaseSoft: `var(--hm-route-base-soft, ${lightPalette.routeBaseSoft})`,
  highlight: `var(--hm-highlight, ${lightPalette.highlight})`,
  highlightSoft: `var(--hm-highlight-soft, ${lightPalette.highlightSoft})`,
  highlightText: `var(--hm-highlight-text, ${lightPalette.highlightText})`,
  success: `var(--hm-success, ${lightPalette.success})`,
  error: `var(--hm-error, ${lightPalette.error})`,
  warning: `var(--hm-warning, ${lightPalette.warning})`,
  chartClimb: `var(--hm-chart-climb, ${lightPalette.chartClimb})`,
  chartDescent: `var(--hm-chart-descent, ${lightPalette.chartDescent})`,
  chartRolling: `var(--hm-chart-rolling, ${lightPalette.chartRolling})`,
  chartFlat: `var(--hm-chart-flat, ${lightPalette.chartFlat})`,
};
