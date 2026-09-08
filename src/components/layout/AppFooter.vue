<script setup lang="ts">
import AppIcon from '@/ui/AppIcon.vue'
</script>

<template>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <p class="footer-note">课程数据仅保存在本机浏览器，不会上传。</p>
      <a
        class="footer-link"
        href="https://github.com/ChickenPige0n/CourseList"
        target="_blank"
        rel="noopener"
      >
        <AppIcon name="github" size="1rem" />
        <span>ChickenPige0n/CourseList</span>
      </a>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
    margin-top: var(--space-16);
    border-top: 1px solid var(--line);
    padding: var(--space-6) 0 var(--space-12);
}

.footer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
}

.footer-note,
.footer-link {
    color: var(--ink-3);
    font-size: var(--text-sm);
}

.footer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 1.5rem;
    text-decoration: none;
    transition: color var(--dur) var(--ease);
}

.footer-link:hover {
    color: var(--accent);
}

@media (max-width: 44rem) {
    .footer-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
    }
}
</style>
