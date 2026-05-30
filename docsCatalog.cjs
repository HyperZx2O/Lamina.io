const APP_FEATURES = [
  {
    id: 'tutor',
    icon: '🎓',
    en: 'Adaptive Tutor',
    bn: 'অ্যাডাপটিভ টিউটর',
    color: '#9cc4b2',
    glow: 'rgba(156,196,178,.28)',
    status: 'current',
    summary: 'Context-aware tutoring for Bangla and English, tuned for class-level explanations and step-by-step guidance.',
  },
  {
    id: 'teacher',
    icon: '👩‍🏫',
    en: 'Teacher Copilot',
    bn: 'শিক্ষক সহকারী',
    color: '#b5d4c8',
    glow: 'rgba(181,212,200,.22)',
    status: 'current',
    summary: 'Teacher-facing workflows for lesson support, explanations, and classroom-ready generation.',
  },
  {
    id: 'multi',
    icon: '🌐',
    en: 'Multilingual',
    bn: 'বহুভাষিক',
    color: '#c98ca7',
    glow: 'rgba(201,140,167,.28)',
    status: 'current',
    summary: 'Cross-language prompts and responses that keep Bengali and English in the same product flow.',
  },
  {
    id: 'answer',
    icon: '💡',
    en: 'Generate Answer',
    bn: 'উত্তর তৈরি',
    color: '#d5bbb1',
    glow: 'rgba(213,187,177,.28)',
    status: 'current',
    summary: 'Short-form and long-form answer drafting with controlled formatting.',
  },
  {
    id: 'questions',
    icon: '❓',
    en: 'Suggest Questions',
    bn: 'প্রশ্ন সাজেস্ট',
    color: '#e76d83',
    glow: 'rgba(231,109,131,.28)',
    status: 'current',
    summary: 'Question generation for practice, review, and assessment planning.',
  },
  {
    id: 'settings',
    icon: '⚙️',
    en: 'Settings',
    bn: 'সেটিংস',
    color: '#7da2f0',
    glow: 'rgba(125,162,240,.18)',
    status: 'current',
    summary: 'Local API key and model override controls for private requests.',
  },
];

const TABS = APP_FEATURES.map(({ id, icon, en, bn, color, glow }) => ({
  id,
  icon,
  en,
  bn,
  color,
  glow,
}));

function featureRowsFromTabs(tabs = APP_FEATURES) {
  return tabs.map((feature) => ({
    name: feature.en,
    nameBn: feature.bn,
    status: feature.status || 'planned',
    summary: feature.summary,
    color: feature.color,
    glow: feature.glow,
  }));
}

module.exports = {
  APP_FEATURES,
  TABS,
  featureRowsFromTabs,
};
