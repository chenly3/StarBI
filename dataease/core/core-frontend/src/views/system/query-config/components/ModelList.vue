<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'
import icon_searchOutline_outlined from '@/assets/svg/sqlbot/icon_search-outline_outlined.svg'
import EmptyBackground from '@/components/empty-background/src/EmptyBackground.vue'
import { supplierList } from '@/utils/sqlbot-entity'

const { t } = useI18n()
const keywords = ref('')

const modelListWithSearch = computed(() => {
  if (!keywords.value) return supplierList
  return supplierList.filter(ele => {
    if (!ele.i18nKey) {
      return ele.name.toLowerCase().includes(keywords.value.toLowerCase())
    }
    const translatedName = t(ele.i18nKey).toLowerCase()
    const originalName = ele.name.toLowerCase()
    const searchTerm = keywords.value.toLowerCase()
    return translatedName.includes(searchTerm) || originalName.includes(searchTerm)
  })
})
const emits = defineEmits(['clickModel'])
const handleModelClick = (item: any) => {
  emits('clickModel', item)
}
</script>

<template>
  <div class="model-list">
    <div class="title">{{ $t('model.select_supplier') }}</div>
    <el-input
      v-model="keywords"
      clearable
      style="width: 100%"
      :placeholder="$t('datasource.search')"
    >
      <template #prefix>
        <el-icon>
          <icon_searchOutline_outlined class="svg-icon" />
        </el-icon>
      </template>
    </el-input>
    <div v-if="modelListWithSearch.length" class="list-content">
      <div
        v-for="ele in modelListWithSearch"
        :key="ele.name"
        class="model"
        @click="handleModelClick(ele)"
      >
        <img width="32px" height="32px" :src="ele.icon" />
        <span class="name">{{ ele.i18nKey ? $t(ele.i18nKey) : ele.name }}</span>
      </div>
    </div>
    <EmptyBackground
      v-else-if="!!keywords"
      class="search-empty"
      :description="$t('datasource.relevant_content_found')"
      img-type="tree"
    />
  </div>
</template>

<style lang="less" scoped>
.model-list {
  width: min(1080px, calc(100% - 56px));
  margin: 0 auto;
  height: 100%;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  .search-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .title {
    font-weight: 500;
    font-size: 18px;
    line-height: 26px;
    margin-bottom: 12px;
  }

  .list-content {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 68px;
    align-content: start;
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 6px;

    .model {
      width: 100%;
      height: 68px;
      display: flex;
      align-items: center;
      padding-left: 16px;
      border: 1px solid #dee0e3;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        box-shadow: 0px 6px 24px 0px #1f232914;
        border-color: rgba(51, 112, 255, 0.22);
      }
      .name {
        margin-left: 12px;
        font-weight: 500;
        font-size: 15px;
        line-height: 24px;
      }
    }
  }
}

@media screen and (max-width: 900px) {
  .model-list {
    width: min(920px, calc(100% - 48px));
    .list-content {
      grid-template-columns: 1fr;
    }
  }
}
</style>
