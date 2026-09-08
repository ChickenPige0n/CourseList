<script setup lang="ts">
import { computed, ref } from 'vue'

import { formatFullDate, toDateKey } from '@/domain'
import { usePreferencesStore } from '@/stores/preferences'
import { useScheduleStore } from '@/stores/schedule'
import { useToast } from '@/composables/useToast'
import { useWindowScrolled } from '@/composables/useWindowScrolled'
import AppIcon from '@/ui/AppIcon.vue'
import BaseButton from '@/ui/BaseButton.vue'
import IconButton from '@/ui/IconButton.vue'

const emit = defineEmits<{ openData: [] }>()

const schedule = useScheduleStore()
const preferences = usePreferencesStore()
const toast = useToast()
const scrolled = useWindowScrolled()

const GREASY_FORK_URL =
  'https://greasyfork.org/zh-CN/scripts/569025-%E6%B7%B1%E5%9C%B3%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%E6%95%99%E5%8A%A1%E7%B3%BB%E7%BB%9F-%E8%AF%BE%E8%A1%A8%E5%AF%BC%E5%87%BAics'

const dateInput = ref<HTMLInputElement | null>(null)

const dateLabel = computed(() => formatFullDate(schedule.selectedDate))
const dateValue = computed(() => toDateKey(schedule.selectedDate))
const themeLabel = computed(() => (preferences.isDark ? '切换到浅色主题' : '切换到深色主题'))

/** 点击日期胶囊唤起系统日期选择器（不支持的浏览器回退到聚焦输入框）。 */
function openDatePicker(): void {
  const input = dateInput.value
  if (!input) return

  input.value = dateValue.value
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
      return
    } catch {
      /* 缺少用户手势时回退 */
    }
  }
  input.focus()
  input.click()
}

function onDateChange(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (value) schedule.selectDateKey(value)
}

function goToToday(): void {
  schedule.goToToday()
  toast.info('已跳转到今天')
}

function toggleTheme(): void {
  preferences.toggleTheme()
  toast.info(preferences.isDark ? '已切换到深色主题' : '已切换到浅色主题')
}
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <div class="wrap header-inner">
      <h1 class="brand">
        <span class="brand-mark" aria-hidden="true">
          <AppIcon name="book-open" size="1.05rem" :stroke-width="2" />
        </span>
        <span class="brand-text">SUAT<span class="brand-sub">课程表</span></span>
      </h1>

      <nav class="datenav" aria-label="按周浏览课程">
        <IconButton icon="chevron-left" label="上一周" @click="schedule.shiftWeek(-1)" />

        <button type="button" class="date-display" @click="openDatePicker">
          <span v-if="schedule.isTodaySelected" class="date-dot" aria-hidden="true" />
          <span class="date-text">{{ dateLabel }}</span>
          <span v-if="schedule.isTodaySelected" class="visually-hidden">（今天）</span>
          <span class="visually-hidden">选择日期</span>
        </button>
        <input
          ref="dateInput"
          type="date"
          class="date-input"
          tabindex="-1"
          aria-hidden="true"
          :value="dateValue"
          @change="onDateChange"
        >

        <IconButton icon="chevron-right" label="下一周" @click="schedule.shiftWeek(1)" />
      </nav>

      <div class="header-actions">
        <BaseButton @click="goToToday">今天</BaseButton>

        <BaseButton
          class="install-btn"
          :href="GREASY_FORK_URL"
          external
          title="在 GreasyFork 打开「课表导出 ICS」浏览器脚本（需先安装 Tampermonkey）"
        >
          <AppIcon name="download" size="1rem" />
          <span class="btn-text">安装脚本</span>
          <span class="visually-hidden">课表导出 ICS 浏览器脚本</span>
        </BaseButton>

        <IconButton
          :icon="preferences.isDark ? 'sun' : 'moon'"
          :label="themeLabel"
          :pressed="preferences.isDark"
          @click="toggleTheme"
        />

        <IconButton icon="settings" label="课程数据管理" @click="emit('openData')" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
    position: sticky;
    top: 0;
    z-index: 60;
    background: var(--canvas);
    background: color-mix(in srgb, var(--canvas) 88%, transparent);
    backdrop-filter: blur(14px) saturate(1.4);
    border-bottom: 1px solid var(--line);
    transition: box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease);
}

.site-header.is-scrolled {
    border-bottom-color: var(--line-2);
    box-shadow: var(--shadow-header);
}

.header-inner {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-4);
    min-height: 4.25rem;
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: var(--text-lg);
    font-weight: 700;
    letter-spacing: var(--tracking-snug);
    white-space: nowrap;
}

.brand-mark {
    display: grid;
    place-items: center;
    width: 2.125rem;
    height: 2.125rem;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-ink);
}

.brand-sub {
    margin-left: 0.3rem;
    color: var(--ink-3);
    font-size: var(--text-md);
    font-weight: 500;
    letter-spacing: var(--tracking-normal);
}

.datenav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-width: 0;
}

.date-display {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 2.5rem;
    padding: 0 var(--space-5);
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    cursor: pointer;
    transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
        transform var(--dur-fast) var(--ease);
}

.date-display:hover {
    background: var(--surface-2);
    border-color: var(--line-2);
}

.date-display:active {
    transform: scale(0.985);
}

.date-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
}

.date-text {
    font-size: var(--text-md);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

/* 仅作为 showPicker() 的值载体，不进入 Tab 顺序 */
.date-input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    opacity: 0;
    pointer-events: none;
    clip-path: inset(50%);
}

.header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
}

@media (max-width: 60rem) {
    .header-inner {
        grid-template-columns: auto auto;
        grid-template-areas:
            'brand actions'
            'date  date';
        row-gap: 0.6rem;
        padding-block: 0.85rem;
    }

    .brand {
        grid-area: brand;
    }

    .datenav {
        grid-area: date;
        justify-content: space-between;
    }

    .header-actions {
        grid-area: actions;
    }

    .date-display {
        flex: 1 1 auto;
    }
}

@media (max-width: 44rem) {
    .brand-sub {
        display: none;
    }

    .install-btn .btn-text {
        display: none;
    }

    .install-btn {
        padding: 0 0.7rem;
    }
}

@media (max-width: 26rem) {
    .header-actions {
        gap: var(--space-1);
    }
}
</style>
