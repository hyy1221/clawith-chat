<template>
  <div class="skeleton-wrapper">
    <!-- Header -->
    <div class="skeleton-header">
      <div class="skeleton-block" style="width: 80px; height: 28px;"></div>
      <div class="skeleton-block" style="width: 36px; height: 36px; border-radius: 8px;"></div>
    </div>

    <!-- Search Bar -->
    <div class="skeleton-search">
      <div class="skeleton-block" style="width: 100%; height: 40px; border-radius: 20px;"></div>
    </div>

    <!-- Section: Digital Employees -->
    <div class="skeleton-section">
      <div class="skeleton-block" style="width: 80px; height: 16px;"></div>
      <div class="skeleton-scroll">
        <div class="skeleton-agent-card">
          <div class="skeleton-block" style="width: 48px; height: 48px; border-radius: 12px;"></div>
          <div class="skeleton-block" style="width: 56px; height: 12px; margin-top: 6px;"></div>
        </div>
        <div class="skeleton-agent-card">
          <div class="skeleton-block" style="width: 48px; height: 48px; border-radius: 12px;"></div>
          <div class="skeleton-block" style="width: 64px; height: 12px; margin-top: 6px;"></div>
        </div>
        <div class="skeleton-agent-card">
          <div class="skeleton-block" style="width: 48px; height: 48px; border-radius: 12px;"></div>
          <div class="skeleton-block" style="width: 48px; height: 12px; margin-top: 6px;"></div>
        </div>
      </div>
    </div>

    <!-- Section: Groups -->
    <div class="skeleton-section">
      <div class="skeleton-label-row">
        <div class="skeleton-block" style="width: 60px; height: 14px;"></div>
        <div class="skeleton-block" style="width: 40px; height: 14px;"></div>
      </div>

      <div class="skeleton-conv-list">
        <div class="skeleton-conv-item" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 80}ms` }">
          <div class="skeleton-block" style="width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;"></div>
          <div class="skeleton-conv-body">
            <div class="skeleton-block" :style="{ width: `${60 + (i % 3) * 15}px`, height: '14px' }"></div>
            <div class="skeleton-block" :style="{ width: `${100 + (i % 4) * 20}px`, height: '12px', marginTop: '8px' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="skeleton-tabbar">
      <div class="skeleton-block" style="width: 60px; height: 20px;"></div>
      <div class="skeleton-block" style="width: 60px; height: 20px;"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  min-height: 100%;
}

.skeleton-block {
  background: linear-gradient(90deg,
    var(--oc-bg-tertiary) 0%,
    var(--oc-bg-elevated) 50%,
    var(--oc-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--oc-border-subtle);
}

.skeleton-search {
  padding: 12px 20px;
}

.skeleton-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--oc-border-subtle);
}

.skeleton-scroll {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-bottom: 4px;
  overflow: hidden;
}

.skeleton-agent-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.skeleton-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skeleton-conv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-conv-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  opacity: 0;
  animation: fadeIn 300ms ease forwards;
}

.skeleton-conv-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.skeleton-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 12px 0;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--oc-border-subtle);
  background: var(--oc-bg-primary);
}
</style>
