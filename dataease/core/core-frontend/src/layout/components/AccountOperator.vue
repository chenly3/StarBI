<script lang="ts" setup>
import userImg from '@/assets/svg/user-img.svg'
import icon_expandDown_filled from '@/assets/svg/icon_expand-down_filled.svg'
import { computed, ref, unref } from 'vue'
import { Icon } from '@/components/icon-custom'
import { useUserStoreWithOut } from '@/store/modules/user'
import { logoutApi } from '@/api/login'
import { logoutHandler } from '@/utils/logout'
import { XpackComponent } from '@/components/plugin'
import { useI18n } from '@/hooks/web/useI18n'
import { useEmitt } from '@/hooks/web/useEmitt'
import AboutPage from '@/views/about/index.vue'
import LangSelector from './LangSelector.vue'
import router from '@/router'
import { useCache } from '@/hooks/web/useCache'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
const appearanceStore = useAppearanceStoreWithOut()
const navigateBg = computed(() => appearanceStore.getNavigateBg)
const { wsCache } = useCache()
const userStore = useUserStoreWithOut()
const { t } = useI18n()

interface LinkItem {
  id: number
  label: string
  link?: string
  method?: string
}
const linkList = ref([{ id: 5, label: t('common.about'), method: 'toAbout' }] as LinkItem[])
if (!appearanceStore.getShowAbout) {
  linkList.value.splice(0, 1)
}

const inPlatformClient = computed(() => !!wsCache.get('de-platform-client'))

const logout = async () => {
  await logoutApi()
  logoutHandler()
}

const linkLoaded = items => {
  items.forEach(item => linkList.value.push(item))
  linkList.value.sort(compare('id'))
}
const xpackLinkLoaded = items => {
  let len = linkList.value.length
  while (len--) {
    if (linkList.value[len]?.id === 2 && linkList.value[len]?.link === '/modify-pwd/index') {
      linkList.value.splice(len, 1)
    }
  }
  items.forEach(item => linkList.value.push(item))
  if (inPlatformClient.value) {
    len = linkList.value.length
    while (len--) {
      if (linkList.value[len]?.id === 2) {
        linkList.value.splice(len, 1)
      }
    }
  }
  linkList.value.sort(compare('id'))
}

const compare = (property: string) => {
  return (a, b) => a[property] - b[property]
}

const toAbout = () => {
  useEmitt().emitter.emit('open-about-dialog')
}

const executeMethod = (item: LinkItem) => {
  if (item?.method) {
    toAbout()
  }

  if (item.link) {
    router.push(item.link)
  }
}

const name = computed(() => userStore.getName)
const uid = computed(() => userStore.getUid)

const buttonRef = ref()
const popoverRef = ref()

const divLanguageRef = ref()
const popoverLanguageRef = ref()

const openLanguage = () => {
  unref(popoverLanguageRef).popperRef?.delayHide?.()
}

const openPopover = () => {
  unref(popoverRef).popperRef?.delayHide?.()
}

if (uid.value === '1') {
  linkLoaded([{ id: 4, link: '/sys-setting/parameter', label: t('commons.system_setting') }])
  const desktop = wsCache.get('app.desktop')
  if (!desktop) {
    linkLoaded([{ id: 2, link: '/modify-pwd/index', label: t('user.change_password') }])
  }
}
</script>

<template>
  <div
    class="top-info-container"
    :class="{ 'is-light-top-info': navigateBg && navigateBg === 'light' }"
    ref="buttonRef"
    v-click-outside="openPopover"
  >
    <el-icon class="main-color">
      <Icon name="user-img"><userImg class="svg-icon" /></Icon>
    </el-icon>
    <span class="uname-span">{{ name }}</span>
    <el-icon class="el-icon-animate">
      <Icon name="icon_expand-down_filled"><icon_expandDown_filled class="svg-icon" /></Icon>
    </el-icon>
  </div>
  <el-popover
    ref="popoverRef"
    :virtual-ref="buttonRef"
    trigger="click"
    title=""
    virtual-triggering
    placement="bottom-start"
    popper-class="uinfo-popover"
    width="224"
  >
    <div class="uinfo-container">
      <div class="uinfo-header de-container">
        <span class="uinfo-name">{{ name }}</span>
        <span class="uinfo-id">{{ `ID: ${uid}` }}</span>
      </div>
      <el-divider />
      <div class="uinfo-main">
        <div
          class="uinfo-main-item de-container"
          v-for="link in linkList"
          :key="link.id"
          @click="executeMethod(link)"
        >
          <span>{{ link.label }}</span>
        </div>

        <div class="uinfo-main-item de-container">
          <div class="about-parent" ref="divLanguageRef" v-click-outside="openLanguage">
            <span>{{ $t('commons.language') }}</span>
            <el-icon class="el-icon-animate">
              <ArrowRight />
            </el-icon>
          </div>
          <el-popover
            ref="popoverLanguageRef"
            :virtual-ref="divLanguageRef"
            trigger="hover"
            title=""
            virtual-triggering
            placement="left"
            width="224"
            popper-class="language-popover"
          >
            <LangSelector />
          </el-popover>
        </div>
      </div>
      <el-divider />
      <div class="uinfo-footer" v-if="!inPlatformClient">
        <div class="uinfo-main-item de-container" @click="logout">
          <span>{{ t('common.exit_system') }}</span>
        </div>
      </div>
    </div>
  </el-popover>

  <AboutPage />
  <XpackComponent jsname="dWNlbnRlci1oYW5kbGVy" @loaded="xpackLinkLoaded" />
</template>

<style lang="less">
.el-icon-animate {
  width: 12px;
  height: 12px;
  font-size: 14px !important;
}
.is-light-top-info {
  .uname-span {
    font-family: var(--de-custom_font, 'PingFang');
    color: #ffffff !important;
  }
  &:hover {
    background-color: rgba(255, 255, 255, 0.24) !important;
  }
}
.top-info-container {
  height: 36px;
  display: flex;
  align-items: center;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  padding: 0 12px 0 4px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: background-color 0.16s ease, transform 0.16s ease;
  &:hover {
    background-color: rgba(255, 255, 255, 0.24);
    transform: translateY(-1px);
  }
  .main-color {
    background: rgba(255, 255, 255, 0.24);
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
  .uname-span {
    font-family: var(--de-custom_font, 'PingFang');
    font-size: 14px;
    color: #ffffff;
    font-weight: 600;
    margin: 0 4px 0 6px;
  }
  .ed-icon {
    margin: 0 4px;
    color: #ffffff;
  }
}
.uinfo-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(238, 246, 255, 0.86), #ffffff 108px);
  .de-container {
    padding: 0 14px 10px;
  }
  .ed-divider--horizontal {
    margin: 0 0 !important;
    color: #2051a7;
    opacity: 0.14;
  }
  .uinfo-header {
    padding-top: 14px !important;
    padding-bottom: 14px !important;
    span {
      display: block;
    }
    .uinfo-name {
      font-size: 15px;
      font-weight: 700;
      color: #18345f;
    }
    .uinfo-id {
      font-size: 13px;
      font-weight: 500;
      color: #6a85ab;
      margin-top: 6px;
    }
  }
  .uinfo-main,
  .uinfo-footer {
    width: 100%;
    .uinfo-main-item {
      width: 100%;
      height: 42px;
      line-height: 42px;
      cursor: pointer;
      border-radius: 10px;
      color: #1e3355;
      font-size: 14px;
      font-weight: 600;
      &:hover {
        background-color: rgba(42, 102, 255, 0.08);
      }
      .about-parent {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    }
  }
}
.uinfo-popover {
  max-height: 372px;
  border-radius: 16px !important;
  border: 1px solid rgba(186, 215, 255, 0.9) !important;
  box-shadow: 0 18px 38px rgba(27, 92, 198, 0.16) !important;
  overflow: hidden;
  .ed-popper__arrow {
    display: none;
  }
  .ed-popover__title {
    display: none;
  }
  padding-left: 0 !important;
  padding-right: 0 !important;
  padding-bottom: 0 !important;
}
.language-popover {
  border-radius: 16px !important;
  border: 1px solid rgba(186, 215, 255, 0.9) !important;
  box-shadow: 0 18px 38px rgba(27, 92, 198, 0.16) !important;
  overflow: hidden;
  background: #ffffff;
  .ed-popper__arrow {
    display: none;
  }
  padding: var(--ed-popover-padding) 0 !important;
}
</style>
