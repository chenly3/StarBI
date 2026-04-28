<script lang="ts" setup>
withDefaults(
  defineProps<{
    inverse?: boolean
    iconOnly?: boolean
    compact?: boolean
  }>(),
  {
    inverse: false,
    iconOnly: false,
    compact: false
  }
)
</script>

<template>
  <div class="starbi-logo" :class="{ inverse, 'icon-only': iconOnly, compact }">
    <span class="starbi-mark" aria-hidden="true">
      <span class="mark-surface"></span>
      <span class="mark-bar mark-bar-1"></span>
      <span class="mark-bar mark-bar-2"></span>
      <span class="mark-bar mark-bar-3"></span>
      <span class="mark-dot"></span>
    </span>
    <span v-if="!iconOnly" class="starbi-text">StarBI</span>
  </div>
</template>

<style lang="less" scoped>
.starbi-logo {
  --starbi-logo-fg: #0f172a;
  --starbi-logo-mark-bg: linear-gradient(
    135deg,
    rgba(51, 112, 255, 0.16),
    rgba(27, 185, 140, 0.18)
  );
  --starbi-logo-mark-border: rgba(51, 112, 255, 0.16);
  --starbi-logo-mark-accent: linear-gradient(180deg, #4f8bff, #1bb98c);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--starbi-logo-fg);
  user-select: none;

  &.inverse {
    --starbi-logo-fg: #ffffff;
    --starbi-logo-mark-bg: rgba(255, 255, 255, 0.14);
    --starbi-logo-mark-border: rgba(255, 255, 255, 0.18);
    --starbi-logo-mark-accent: linear-gradient(180deg, #ffffff, #dbeafe);
  }

  &.compact {
    gap: 10px;

    .starbi-mark {
      width: 30px;
      height: 30px;
      border-radius: 10px;
    }

    .starbi-text {
      font-size: 22px;
    }
  }

  &.icon-only {
    gap: 0;
  }
}

.starbi-mark {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--starbi-logo-mark-bg);
  border: 1px solid var(--starbi-logo-mark-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;

  .mark-surface {
    position: absolute;
    inset: 5px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.6);
  }

  .mark-bar {
    position: absolute;
    bottom: 7px;
    width: 4px;
    border-radius: 999px;
    background: var(--starbi-logo-mark-accent);
    box-shadow: 0 4px 10px rgba(51, 112, 255, 0.2);
  }

  .mark-bar-1 {
    left: 10px;
    height: 8px;
  }

  .mark-bar-2 {
    left: 15px;
    height: 13px;
  }

  .mark-bar-3 {
    left: 20px;
    height: 17px;
  }

  .mark-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffb020;
    box-shadow: 0 0 0 3px rgba(255, 176, 32, 0.18);
  }
}

.starbi-text {
  font-family: 'Avenir Next', 'Segoe UI', var(--de-custom_font, 'PingFang'), sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
}
</style>
