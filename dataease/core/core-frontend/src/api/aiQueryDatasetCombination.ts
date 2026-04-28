import request from '@/config/axios'

export interface AIQueryDatasetCombinationRelationRequest {
  leftDatasetId: string
  leftField: string
  rightDatasetId: string
  rightField: string
  relationType: string
}

export interface AIQueryDatasetCombinationCreateRequest {
  name: string
  primaryDatasetId: string
  secondaryDatasetIds: string[]
  relations: AIQueryDatasetCombinationRelationRequest[]
}

export interface AIQueryDatasetCombinationResult {
  combinationId: string
  combinationName: string
  datasourceId: string
  datasourcePending: boolean
}

export const createAIQueryDatasetCombination = async (
  data: AIQueryDatasetCombinationCreateRequest
): Promise<AIQueryDatasetCombinationResult> => {
  return request.post({ url: '/ai/query/dataset-combination', data }).then((res: any) => {
    const payload = res?.data || res || {}
    return {
      combinationId: String(payload?.combinationDatasetId || ''),
      combinationName: String(payload?.combinationDatasetName || ''),
      datasourceId: String(payload?.datasourceId || ''),
      datasourcePending: Boolean(payload?.datasourcePending)
    }
  })
}
