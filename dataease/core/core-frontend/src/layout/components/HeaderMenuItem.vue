<script lang="ts">
import { h } from 'vue'
import icon_expandDown_filled from '@/assets/svg/icon_expand-down_filled.svg'
import { ElMenuItem, ElSubMenu } from 'element-plus-secondary'

const title = props => {
  const { title } = props?.menu?.meta || {}
  return [h('span', null, { default: () => title })]
}

const HeaderMenuItem = props => {
  if (!props) return null
  const { children = [], hidden, path } = props?.menu || {}
  if (hidden) {
    return null
  }

  if (children?.length) {
    return h(
      ElSubMenu,
      {
        index: path,
        'popper-class': 'popper-class-menu',
        showTimeout: 1,
        expandCloseIcon: icon_expandDown_filled,
        expandOpenIcon: icon_expandDown_filled
      },
      {
        title: () => title(props),
        default: () => children.map(ele => h(HeaderMenuItem, { menu: ele, index: path }))
      }
    )
  }

  return h(
    ElMenuItem,
    { index: props.index ? `${props.index}/${path}` : path },
    {
      title: () => title(props)
    }
  )
}
export default HeaderMenuItem
</script>

<style lang="less">
.popper-class-menu {
  --active-color: #1f4fb5;
  &.is-light {
    border: none !important;
    margin-top: 6px;
  }
  .popper-class-menu {
    min-width: 164px;
    border-radius: 16px;
    border: 1px solid rgba(186, 215, 255, 0.9) !important;
    box-shadow: 0 18px 38px rgba(27, 92, 198, 0.16);
    overflow: hidden;
    background: linear-gradient(180deg, rgba(238, 246, 255, 0.92), #ffffff 100%);

    .ed-menu--popup {
      min-width: 150px;
      padding: 6px;
      background: transparent;
      .ed-menu-item {
        height: 40px;
        line-height: 40px;
        padding: 0 12px !important;
        border-radius: 10px;
        color: #355785;
        font-size: 14px;
        font-weight: 600;
      }
      .ed-menu-item:hover {
        background: rgba(42, 102, 255, 0.08);
        color: #1f4fb5;
      }
      .ed-menu-item.is-active {
        background: rgba(42, 102, 255, 0.14);
        color: #1f4fb5;
      }
    }
  }
}
</style>
