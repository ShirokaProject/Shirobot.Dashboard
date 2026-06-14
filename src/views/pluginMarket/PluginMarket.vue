<template>
  <div class="market-page">
    <section class="market-hero">
      <label class="market-search" aria-label="搜索插件">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.5 4a5.5 5.5 0 0 1 4.39 8.81l4.65 4.65-1.08 1.08-4.65-4.65A5.5 5.5 0 1 1 9.5 4Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
        <input v-model="keyword" type="search" placeholder="搜索插件、作者或分类" />
      </label>
    </section>

    <section class="market-controls" aria-label="插件市场筛选">
      <div class="market-control-group">
        <span class="control-label">来源渠道</span>
        <div class="control-segmented" role="group" aria-label="来源渠道">
          <button
            v-for="source in sourceOptions"
            :key="source"
            type="button"
            class="control-segment"
            :class="{ active: activeSource === source }"
            :aria-pressed="activeSource === source"
            @click="activeSource = source; activeCategory = '全部'"
          >
            {{ source }}
          </button>
        </div>
      </div>

      <div class="market-control-group align-end">
        <span class="control-label">排序</span>
        <div class="control-segmented" role="group" aria-label="排序">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            type="button"
            class="control-segment"
            :class="{ active: activeSort === option.value }"
            :aria-pressed="activeSort === option.value"
            @click="activeSort = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="market-category-row" aria-label="插件分类">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        class="category-chip"
        :class="{ active: activeCategory === category }"
        @click="activeCategory = category"
      >
        {{ category }}
      </button>
    </section>

    <section class="market-grid">
      <article v-for="plugin in filteredPlugins" :key="plugin.id" class="market-card">
        <div class="market-card-top">
          <div class="plugin-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9.5 3a2.5 2.5 0 0 1 4.9.5H16a2 2 0 0 1 2 2v3.1a2.5 2.5 0 0 1 .5 4.9H18V18a2 2 0 0 1-2 2h-3.1a2.5 2.5 0 0 1-4.8 0H5a2 2 0 0 1-2-2v-3.1a2.5 2.5 0 0 1 0-4.8V5.5a2 2 0 0 1 2-2h4.1A2.5 2.5 0 0 1 9.5 3Zm0 1.5a1 1 0 0 0-1 1v1.4H5a.5.5 0 0 0-.5.5v4.4l-.62-.14a1 1 0 1 0 0 1.95l.62-.14V18a.5.5 0 0 0 .5.5h4.4l-.14.62a1 1 0 1 0 1.95 0l-.14-.62H16a.5.5 0 0 0 .5-.5v-6h1.4a1 1 0 1 0 0-2h-1.4V5.5A.5.5 0 0 0 16 5h-3.1l.14-.62a1 1 0 1 0-1.95 0L11.24 5H9.5a1 1 0 0 1 0-.5Z" />
            </svg>
          </div>

          <div class="market-card-title">
            <h3>{{ plugin.name }}</h3>
            <p>{{ plugin.author }}</p>
          </div>

          <span class="market-version">v{{ plugin.version }}</span>
        </div>

        <p class="market-desc">{{ plugin.description }}</p>

        <div class="market-meta">
          <span>{{ plugin.category }}</span>
          <span>{{ plugin.source }}</span>
          <span>{{ plugin.downloads }} downloads</span>
          <span>{{ plugin.publishedAt }}</span>
        </div>

        <div class="market-actions">
          <button type="button" class="market-action text">详情</button>
          <button type="button" class="market-action tonal">安装</button>
        </div>
      </article>

      <el-empty v-if="!filteredPlugins.length" description="暂无插件市场数据，后端接入后将在这里显示可安装插件。" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePluginMarketPage } from './PluginMarket'

const {
  keyword,
  activeCategory,
  activeSource,
  activeSort,
  loadError,
  sourceOptions,
  sortOptions,
  categories,
  filteredPlugins
} = usePluginMarketPage()
</script>

<style scoped src="./PluginMarket.css"></style>
