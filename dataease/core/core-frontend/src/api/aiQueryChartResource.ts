import request from '@/config/axios'

export const validateAIQueryChartInsert = (data: Record<string, any>) =>
  request.post({ url: '/ai/query/chart-resources/validate', data }).then((res: any) => {
    return res?.data || res
  })

export const listAIQueryRecentResults = () =>
  request.get({ url: '/ai/query/chart-resources/recent-results' }).then((res: any) => {
    return res?.data || res
  })

export const listAIQueryChartResources = () =>
  request.get({ url: '/ai/query/chart-resources/saved' }).then((res: any) => {
    return res?.data || res
  })

export const listAIQueryInsertTargets = (canvasType: string) =>
  request
    .get({
      url: '/ai/query/chart-resources/targets',
      params: { canvasType }
    })
    .then((res: any) => {
      return res?.data || res
    })

export const insertAIQueryChartIntoCanvas = (data: Record<string, any>) =>
  request.post({ url: '/ai/query/chart-resources/insert', data }).then((res: any) => {
    return res?.data || res
  })
