<!-- Znak Dyżurnego: głowa narysowana jak stacja na mapie, w czapce dyżurnego ruchu. Denko jest
     w tuszu, bo czerwień należy do matury rozszerzonej. -->
<template>
  <svg class="ai-tutor-avatar" viewBox="0 0 24 24" aria-hidden="true">
    <circle class="ai-tutor-avatar__head" cx="12" cy="14.5" r="7" />
    <path class="ai-tutor-avatar__crown" d="M4.5 9 Q12 2.5 19.5 9 L18.5 10.5 H5.5 Z" />
    <path class="ai-tutor-avatar__peak" d="M4 10.5 H20" />
  </svg>
</template>

<style scoped>
.ai-tutor-avatar {
  flex: none;
  width: 1.5em;
  height: 1.5em;
  overflow: visible;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ai-tutor-avatar__head {
  fill: var(--surface);
}

.ai-tutor-avatar__crown {
  fill: var(--ink);
}
</style>
