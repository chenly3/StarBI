import { createRouter, createWebHashHistory } from 'vue-router_2'
import type { RouteRecordRaw } from 'vue-router_2'
import type { App } from 'vue'

export const routes: AppRouteRecordRaw[] = [
  {
    path: '/',
    name: 'index',
    redirect: '/workbranch/index',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: {},
    children: [
      {
        path: 'workbranch/index',
        name: 'workbranch',
        hidden: true,
        component: () => import('@/views/workbranch/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sqlbot',
    name: 'sqlbot',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: {},
    children: [
      {
        path: 'index',
        name: 'clt',
        hidden: true,
        redirect: '/sqlbotnew',
        meta: { hidden: true }
      },
      {
        path: 'old',
        name: 'sqlbot-old',
        hidden: true,
        component: () => import('@/views/sqlbot/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sqlbotnew',
    name: 'sqlbot-new-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: {},
    children: [
      {
        path: '',
        name: 'sqlbot-new',
        hidden: true,
        component: () => import('@/views/sqlbot-new/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sqlbot-home-prototype',
    name: 'sqlbot-home-prototype',
    hidden: true,
    meta: { hidden: true },
    component: () => import('@/views/sqlbot-home-prototype/index.vue')
  },
  {
    path: '/query-config-prototype',
    name: 'query-config-prototype',
    hidden: true,
    meta: { hidden: true },
    component: () => import('@/views/system/query-config/QueryResourcePrototype.vue')
  },
  {
    path: '/query-theme',
    name: 'query-theme-redirect',
    hidden: true,
    meta: { hidden: true },
    redirect: '/starbi/query-theme'
  },
  {
    path: '/query-config',
    name: 'query-config-redirect',
    hidden: true,
    meta: { hidden: true },
    redirect: '/sys-setting/query-config'
  },
  {
    path: '/sys-setting/query-config',
    name: 'sys-setting-query-config-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-query-config-page',
        hidden: true,
        component: () => import('@/views/system/query-config/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/parameter',
    name: 'sys-setting-parameter-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-parameter-page',
        hidden: true,
        component: () => import('@/views/system/parameter/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/font',
    name: 'sys-setting-font-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-font-page',
        hidden: true,
        component: () => import('@/views/system/font/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/user',
    name: 'sys-setting-user-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-user-page',
        hidden: true,
        component: () =>
          import('../../../../de-xpack/user-management/src/menu/system/user/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/org',
    name: 'sys-setting-org-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-org-page',
        hidden: true,
        component: () =>
          import('../../../../de-xpack/organization-management/src/menu/system/org/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/permission',
    name: 'sys-setting-permission-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-permission-page',
        hidden: true,
        component: () =>
          import('../../../../de-xpack/permission-management/src/menu/system/permission/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/sys-setting/row-column-permission',
    name: 'sys-setting-row-column-permission-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-row-column-permission-page',
        hidden: true,
        component: () =>
          import(
            '../../../../de-xpack/permission-management/src/menu/system/permission/RowColumnPermissionPage.vue'
          ),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/menu/system/user',
    name: 'menu-system-user-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: 'index',
        name: 'menu-system-user-page',
        hidden: true,
        component: () =>
          import('../../../../de-xpack/user-management/src/menu/system/user/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/starbi',
    name: 'starbi-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: {},
    children: [
      {
        path: 'query-theme',
        name: 'starbi-query-theme',
        hidden: true,
        component: () => import('@/views/visualized/data/query-theme/index.vue'),
        meta: { hidden: true }
      },
      {
        path: 'query-config',
        name: 'starbi-query-config',
        hidden: true,
        redirect: '/sys-setting/query-config',
        meta: { hidden: true }
      },
      {
        path: 'system-user',
        name: 'starbi-system-user',
        hidden: true,
        component: () =>
          import('../../../../de-xpack/user-management/src/menu/system/user/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/login',
    name: 'login',
    hidden: true,
    meta: {},
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/admin-login',
    name: 'admin-login',
    hidden: true,
    meta: {},
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/401',
    name: '401',
    hidden: true,
    meta: {},
    component: () => import('@/views/401/index.vue')
  },
  {
    path: '/dvCanvas',
    name: 'dvCanvas',
    hidden: true,
    meta: {},
    component: () => import('@/views/data-visualization/index.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    hidden: true,
    meta: {},
    component: () => import('@/views/dashboard/index.vue')
  },
  {
    path: '/dashboardPreview',
    name: 'dashboardPreview',
    hidden: true,
    meta: {},
    component: () => import('@/views/dashboard/DashboardPreviewShow.vue')
  },
  {
    path: '/chart',
    name: 'chart',
    hidden: true,
    meta: {},
    component: () => import('@/views/chart/index.vue')
  },
  {
    path: '/previewShow',
    name: 'previewShow',
    hidden: true,
    meta: {},
    component: () => import('@/views/data-visualization/PreviewShow.vue')
  },
  {
    path: '/DeResourceTree',
    name: 'DeResourceTree',
    hidden: true,
    meta: {},
    component: () => import('@/views/common/DeResourceTree.vue')
  },
  {
    path: '/dataset-embedded',
    name: 'dataset-embedded',
    hidden: true,
    meta: {},
    component: () => import('@/views/visualized/data/dataset/index.vue')
  },
  {
    path: '/dataset-embedded-form',
    name: 'dataset-embedded-form',
    hidden: true,
    meta: {},
    component: () => import('@/views/visualized/data/dataset/form/index.vue')
  },
  {
    path: '/preview',
    name: 'preview',
    hidden: true,
    meta: {},
    component: () => import('@/views/data-visualization/PreviewCanvas.vue')
  },
  {
    path: '/de-link/:uuid',
    name: 'link',
    hidden: true,
    meta: {},
    component: () => import('@/views/data-visualization/LinkContainer.vue')
  },
  {
    path: '/rich-text',
    name: 'rich-text',
    hidden: true,
    meta: {},
    component: () => import('@/custom-component/rich-text/DeRichTextView.vue')
  },
  {
    path: '/modify-pwd',
    name: 'modify-pwd',
    hidden: true,
    meta: {},
    component: () => import('@/layout/index.vue'),
    children: [
      {
        path: 'index',
        name: 'mpi',
        hidden: true,
        component: () => import('@/views/system/modify-pwd/index.vue'),
        meta: { hidden: true }
      }
    ]
  },
  {
    path: '/chart-view',
    name: 'chart-view',
    hidden: true,
    meta: {},
    component: () => import('@/views/chart/ChartView.vue')
  },
  {
    path: '/template-manage',
    name: 'template-manage',
    hidden: true,
    meta: {},
    component: () => import('@/views/template/indexInject.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes as RouteRecordRaw[]
})

;(window as Window & { vueRouterDe?: typeof router }).vueRouterDe = router

export const resetRouter = (): void => {
  const resetWhiteNameList = ['Login']
  router.getRoutes().forEach(route => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
