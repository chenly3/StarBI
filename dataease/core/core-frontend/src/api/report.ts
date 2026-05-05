import { request } from '@/utils/request'

/**
 * 分页查询任务列表
 */
export const reportPager = (data: {
  goPage: number
  pageSize: number
  request: {
    keyword?: string
    statusList?: number[]
    timeDesc?: boolean
  }
}) => {
  return request.post({
    url: '/reportTask/pager/' + data.goPage + '/' + data.pageSize,
    data: data.request
  })
}

/**
 * 创建任务
 */
export const reportCreate = (data: any) => {
  return request.post({
    url: '/reportTask/create',
    data
  })
}

/**
 * 更新任务
 */
export const reportUpdate = (data: any) => {
  return request.post({
    url: '/reportTask/update',
    data
  })
}

/**
 * 查询任务详情
 */
export const reportInfo = (taskId: number) => {
  return request.get({
    url: '/reportTask/info/' + taskId
  })
}

/**
 * 立即执行
 */
export const reportFireNow = (taskId: number) => {
  return request.post({
    url: '/reportTask/fireNow/' + taskId
  })
}

/**
 * 停止任务
 */
export const reportStop = (taskId: number) => {
  return request.post({
    url: '/reportTask/stop/' + taskId
  })
}

/**
 * 启动任务
 */
export const reportStart = (taskId: number) => {
  return request.post({
    url: '/reportTask/start/' + taskId
  })
}

/**
 * 删除任务
 */
export const reportDelete = (taskIdList: number[]) => {
  return request.post({
    url: '/reportTask/delete',
    data: taskIdList
  })
}

/**
 * 查询日志列表
 */
export const reportLogPager = (data: {
  goPage: number
  pageSize: number
  request: {
    taskId?: number
    execStatusList?: number[]
  }
}) => {
  return request.post({
    url: '/reportTask/logPager/' + data.goPage + '/' + data.pageSize,
    data: data.request
  })
}

/**
 * 删除日志
 */
export const reportDeleteLog = (data: {
  taskId?: number
  ids?: number[]
}) => {
  return request.post({
    url: '/reportTask/deleteLog',
    data
  })
}

/**
 * 获取日志错误信息
 */
export const reportLogMsg = (id: number) => {
  return request.post({
    url: '/reportTask/logMsg',
    data: { id }
  })
}

/**
 * 导出配置
 */
export const reportExport = (taskIdList: number[]) => {
  return request.post({
    url: '/reportTask/export',
    data: taskIdList,
    responseType: 'blob'
  })
}
