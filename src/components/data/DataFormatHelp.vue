<script setup lang="ts">
interface FieldDoc {
  readonly name: string
  readonly type: string
  readonly required: boolean
  readonly note: string
}

const FIELDS: readonly FieldDoc[] = [
  { name: 'lessonName', type: 'string', required: true, note: '课程名称' },
  { name: 'teacherName', type: 'string', required: false, note: '授课教师，缺省为「未知教师」' },
  { name: 'classRoomName', type: 'string', required: false, note: '上课地点，缺省为「未知地点」' },
  { name: 'startTime', type: 'number', required: true, note: '开始时刻，epoch 毫秒（也接受 ISO 字符串）' },
  { name: 'endTime', type: 'number', required: true, note: '结束时刻，epoch 毫秒' },
  { name: 'description', type: 'string', required: false, note: '课程描述，显示在详情面板' },
  { name: 'tagcolour', type: 'string', required: false, note: '课程色，作为时间轴节点颜色' },
]

const SHAPES: readonly string[] = [
  '[ … ]',
  '{ "data": [ … ] }',
  '{ "data": { "list": [ … ] } }',
  '{ "list": [ … ] }',
]
</script>

<template>
  <section class="field-group" aria-labelledby="formatTitle">
    <h3 id="formatTitle" class="eyebrow">数据格式</h3>

    <p class="hint">课程数组可以放在以下任意结构中，导入时会自动识别：</p>
    <ul class="shape-list">
      <li v-for="shape in SHAPES" :key="shape"><code>{{ shape }}</code></li>
    </ul>

    <table class="field-table">
      <caption class="visually-hidden">课程对象字段说明</caption>
      <thead>
        <tr>
          <th scope="col">字段</th>
          <th scope="col">类型</th>
          <th scope="col">说明</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="field in FIELDS" :key="field.name">
          <th scope="row"><code>{{ field.name }}</code></th>
          <td>
            {{ field.type }}<span v-if="field.required" class="required">必填</span>
          </td>
          <td>{{ field.note }}</td>
        </tr>
      </tbody>
    </table>

    <p class="hint">
      也可以直接导入教务系统导出的 <code>.ics</code> 文件：
      <code>SUMMARY</code> → 课程名，<code>LOCATION</code> → 教室（自动去掉校区前缀），
      <code>DESCRIPTION</code> 中的教师 → 授课教师，重复日程会自动展开。
    </p>
  </section>
</template>

<style scoped>
.field-group h3 {
    margin-bottom: var(--space-3);
}

.hint {
    margin-top: var(--space-3);
    color: var(--ink-3);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    text-wrap: pretty;
}

.hint:first-of-type {
    margin-top: 0;
}

.hint code {
    padding: 0.1em 0.35em;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--ink-2);
    font-family: var(--font-mono);
    font-size: 0.9em;
}

.shape-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: var(--space-2);
}

.shape-list code {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--ink-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
}

.field-table {
    width: 100%;
    margin-top: var(--space-4);
    border-collapse: collapse;
    font-size: var(--text-sm);
}

.field-table th,
.field-table td {
    padding: 0.5rem 0.6rem 0.5rem 0;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
}

.field-table thead th {
    color: var(--ink-3);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-wide);
}

.field-table tbody th {
    font-weight: 500;
    white-space: nowrap;
}

.field-table td:first-of-type {
    color: var(--ink-2);
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
}

.field-table td:last-of-type {
    color: var(--ink-2);
}

.field-table code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--ink);
}

.required {
    margin-left: 0.35rem;
    padding: 0.05rem 0.3rem;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-family: var(--font-sans);
    font-size: var(--text-2xs);
}
</style>
