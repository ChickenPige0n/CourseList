<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useCourseStore } from '@/stores/courses'
import { useBusy } from '@/composables/useBusy'
import { useCourseTransfer } from '@/composables/useCourseTransfer'
import AppIcon from '@/ui/AppIcon.vue'
import BaseButton from '@/ui/BaseButton.vue'
import BaseDialog from '@/ui/BaseDialog.vue'
import DataFormatHelp from '@/components/data/DataFormatHelp.vue'
import type { IconName } from '@/ui/icons'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const courseStore = useCourseStore()
const transfer = useCourseTransfer()
const busy = useBusy()

const editorText = ref('')
const editorVisible = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)

const status = computed(() =>
  courseStore.hasData
    ? `已导入 ${courseStore.count} 门课程 · 数据保存在本机浏览器`
    : '尚未导入课程数据',
)

const canSave = computed(() => editorText.value.trim().length > 0)

watch(
  () => props.open,
  (open) => {
    if (!open) editorVisible.value = false
  },
)

interface TileAction {
  readonly key: string
  readonly icon: IconName
  readonly label: string
  readonly hint: string
  readonly danger?: boolean
  readonly run: () => void
}

const tiles: readonly TileAction[] = [
  {
    key: 'file',
    icon: 'folder-open',
    label: '选择文件',
    hint: 'JSON / ICS',
    run: () => fileInput.value?.click(),
  },
  {
    key: 'paste',
    icon: 'clipboard-paste',
    label: '粘贴文本',
    hint: 'JSON / ICS',
    run: openEditor,
  },
  {
    key: 'export-ics',
    icon: 'download',
    label: '导出日历',
    hint: '全部课程 .ics',
    run: () => transfer.exportAllIcs(),
  },
  {
    key: 'export-json',
    icon: 'save',
    label: '导出 JSON',
    hint: '备份数据',
    run: () => transfer.exportJson(),
  },
  {
    key: 'clear',
    icon: 'trash',
    label: '清除数据',
    hint: '仅本机',
    danger: true,
    run: () => {
      transfer.clearAll()
      editorVisible.value = false
      editorText.value = ''
    },
  },
]

/** 打开编辑器：已有数据时预填当前 JSON，方便直接修改。 */
function openEditor(): void {
  editorVisible.value = true
  if (editorText.value.trim() === '' && courseStore.hasData) {
    editorText.value = courseStore.toJson()
  }
  void nextTick(() => textarea.value?.focus())
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 允许重复选择同一个文件
  input.value = ''
  if (!file) return

  busy.show('正在读取课表文件…')
  try {
    const result = await transfer.convertFile(file)
    if (result.ok) {
      editorText.value = result.jsonText
      editorVisible.value = true
    }
  } finally {
    busy.hide()
  }
}

function validate(): void {
  const result = transfer.convert(editorText.value)
  if (result.ok) editorText.value = result.jsonText
}

function save(): void {
  const result = transfer.apply(editorText.value)
  if (!result.ok) return
  editorVisible.value = false
  emit('close')
}
</script>

<template>
  <BaseDialog :open="open" title="课程数据" :subtitle="status" @close="emit('close')">
    <section class="field-group" aria-labelledby="importTitle">
      <h3 id="importTitle" class="eyebrow">导入与导出</h3>

      <div class="action-grid">
        <button
          v-for="tile in tiles"
          :key="tile.key"
          type="button"
          class="tile"
          :class="{ 'tile-danger': tile.danger }"
          @click="tile.run()"
        >
          <span class="tile-icon">
            <AppIcon :name="tile.icon" size="1.05rem" />
          </span>
          <span class="tile-label">{{ tile.label }}</span>
          <small>{{ tile.hint }}</small>
        </button>
      </div>

      <p class="hint">
        ICS 文件可直接选择导入，或粘贴 ICS 文本后点「保存并应用」；导入时会自动转换为 JSON 格式。
      </p>

      <input
        ref="fileInput"
        type="file"
        accept=".json,.txt,.ics,text/calendar,application/json"
        hidden
        @change="onFileSelected"
      >

      <ul v-if="courseStore.warnings.length > 0" class="warnings">
        <li v-for="warning in courseStore.warnings" :key="warning">{{ warning }}</li>
      </ul>
    </section>

    <section v-if="editorVisible" class="field-group" aria-labelledby="editorTitle">
      <h3 id="editorTitle" class="eyebrow">编辑</h3>
      <label class="field-label" for="dataEdit">JSON / ICS 文本</label>
      <textarea
        id="dataEdit"
        ref="textarea"
        v-model="editorText"
        spellcheck="false"
        placeholder="粘贴 JSON 或 ICS 文本…"
      />
      <div class="editor-actions">
        <BaseButton :disabled="!canSave" @click="validate">
          <AppIcon name="check-circle" size="1rem" />
          <span>验证格式</span>
        </BaseButton>
        <BaseButton variant="primary" :disabled="!canSave" @click="save">
          <AppIcon name="save" size="1rem" />
          <span>保存并应用</span>
        </BaseButton>
      </div>
    </section>

    <DataFormatHelp />
  </BaseDialog>
</template>

<style scoped>
.field-group + .field-group,
.field-group + :deep(.field-group) {
    margin-top: var(--space-8);
    padding-top: var(--space-8);
    border-top: 1px solid var(--line);
}

.field-group h3 {
    margin-bottom: var(--space-3);
}

.action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: var(--space-2);
}

.tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
    cursor: pointer;
    transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
        color var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.tile-icon {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    margin-bottom: var(--space-2);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink-2);
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}

.tile-label {
    font-size: var(--text-base);
    font-weight: 600;
}

.tile small {
    color: var(--ink-3);
    font-size: var(--text-xs);
}

.tile:hover {
    background: var(--surface-2);
    border-color: var(--line-2);
    transform: translateY(-2px);
}

.tile:hover .tile-icon {
    background: var(--surface);
}

.tile:active {
    transform: translateY(0);
}

.tile-danger:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.tile-danger:hover .tile-icon {
    background: var(--accent-soft);
    color: var(--accent);
}

.hint {
    margin-top: var(--space-3);
    color: var(--ink-3);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    text-wrap: pretty;
}

.warnings {
    margin-top: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--soon-soft);
    border-radius: var(--radius);
    background: var(--soon-soft);
    color: var(--soon);
    font-size: var(--text-sm);
}

.field-label {
    display: block;
    margin-bottom: var(--space-2);
    color: var(--ink-3);
    font-size: var(--text-sm);
}

#dataEdit {
    width: 100%;
    min-height: 15rem;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    resize: vertical;
}

#dataEdit:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-color: transparent;
}

.editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-3);
}
</style>
