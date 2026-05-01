import icon_alybl_colorful from '@/assets/model/icon_alybl_colorful.png'
import icon_bdyzn_colorful from '@/assets/model/icon_bdyzn_colorful.png'
import icon_deepseek_colorful from '@/assets/model/icon_deepseek_colorful.png'
import icon_txy_colorful from '@/assets/model/icon_txy_colorful.png'
import icon_xfhx_colorful from '@/assets/model/icon_xfhx_colorful.png'
import icon_gemini_colorful from '@/assets/model/icon_gemini_colorful.png'
import icon_openai_colorful from '@/assets/model/icon_openai_colorful.png'
import icon_kimi_colorful from '@/assets/model/icon_kimi_colorful.png'
import icon_txhy_colorful from '@/assets/model/icon_txhy_colorful.png'
import icon_hsyq_colorful from '@/assets/model/icon_hsyq_colorful.png'
import icon_common_openai from '@/assets/model/icon_common_openai.png'
import icon_minimax_colorful from '@/assets/model/icon_minimax_colorful.png'

export interface SelectOption {
  label: string
  value: string | number
  i18nKey?: string
}

export const modelTypeOptions: SelectOption[] = [
  { label: '大语言模型', value: 0, i18nKey: 'modelType.llm' }
]

export const getModelTypeName = (value: any) => {
  const tv = parseInt(value)
  const item = modelTypeOptions.find(item => item.value === tv)
  return item?.i18nKey || item?.label || ''
}

type ModelArg = { key: string; val?: string | number; type: string; range?: string }
type ModelOption = { name: string; api_domain?: string; args?: ModelArg[] }
type ModelConfig = Record<
  number,
  {
    api_domain: string
    common_args?: ModelArg[]
    model_options: ModelOption[]
  }
>

export interface SupplierItem {
  id: number
  name: string
  label: string
  value: number
  i18nKey?: string
  icon: string
  type?: string
  is_private?: boolean
  model_config: ModelConfig
}

const createSupplier = (
  item: Omit<SupplierItem, 'label' | 'value' | 'icon'> & {
    label?: string
    value?: number
    icon?: string
  }
): SupplierItem => ({
  ...item,
  label: item.label || item.name,
  value: item.value || item.id,
  icon: item.icon || icon_common_openai
})

export const supplierList: SupplierItem[] = [
  createSupplier({
    id: 1,
    name: '阿里云百炼',
    i18nKey: 'supplier.alibaba_cloud_bailian',
    icon: icon_alybl_colorful,
    model_config: {
      0: {
        api_domain: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        common_args: [
          { key: 'temperature', val: 1.0, type: 'number', range: '[0, 2)' },
          { key: 'extra_body', val: '{"enable_thinking": false}', type: 'json' }
        ],
        model_options: [
          { name: 'qwen3.6-plus' },
          { name: 'qwen3.5-plus' },
          { name: 'qwen3.5-flash' },
          { name: 'qwen3-coder-next' },
          { name: 'qwen3-coder-plus' },
          { name: 'qwen3-coder-flash' },
          { name: 'qwen-plus' },
          { name: 'qwen-max' },
          { name: 'qwen-max-latest' },
          { name: 'qwen-turbo' },
          { name: 'qwen-turbo-latest' },
          { name: 'qwen-long' }
        ]
      }
    }
  }),
  createSupplier({
    id: 2,
    name: '千帆大模型',
    i18nKey: 'supplier.qianfan_model',
    icon: icon_bdyzn_colorful,
    model_config: {
      0: {
        api_domain: 'https://qianfan.baidubce.com/v2/',
        model_options: [{ name: 'ernie-x1-turbo-32k' }]
      }
    }
  }),
  createSupplier({
    id: 3,
    name: 'DeepSeek',
    i18nKey: 'supplier.deepseek',
    icon: icon_deepseek_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.deepseek.com',
        model_options: [{ name: 'deepseek-chat' }]
      }
    }
  }),
  createSupplier({
    id: 4,
    name: '腾讯混元',
    i18nKey: 'supplier.tencent_hunyuan',
    icon: icon_txhy_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.hunyuan.cloud.tencent.com/v1/',
        common_args: [{ key: 'temperature', val: 1.0, type: 'number', range: '[0, 2]' }],
        model_options: [
          { name: 'hunyuan-turbos-latest' },
          { name: 'hunyuan-standard-256K' },
          { name: 'hunyuan-standard' }
        ]
      }
    }
  }),
  createSupplier({
    id: 5,
    name: '讯飞星火',
    i18nKey: 'supplier.iflytek_spark',
    icon: icon_xfhx_colorful,
    model_config: {
      0: {
        api_domain: 'https://spark-api-open.xf-yun.com/v1/',
        common_args: [
          { key: 'temperature', val: 1.0, type: 'number', range: '[0, 2]' },
          { key: 'max_tokens', val: 4096, type: 'number', range: '[1, 32768]' }
        ],
        model_options: [
          {
            name: '4.0Ultra',
            args: [
              { key: 'temperature', val: 0.5, type: 'number', range: '[0, 1]' },
              { key: 'max_tokens', val: 8192, type: 'number', range: '[1, 8192]' }
            ]
          },
          {
            name: 'x1',
            api_domain: 'https://spark-api-open.xf-yun.com/v2/',
            args: [
              { key: 'max_tokens', val: 32768, type: 'number', range: '[1, 32768]' },
              { key: 'temperature', val: 1.2, type: 'number', range: '(0, 2]' }
            ]
          }
        ]
      }
    }
  }),
  createSupplier({
    id: 6,
    name: 'Gemini',
    i18nKey: 'supplier.gemini',
    icon: icon_gemini_colorful,
    model_config: {
      0: {
        api_domain: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        common_args: [{ key: 'temperature', val: 0.7, type: 'number', range: '(0, 1]' }],
        model_options: [
          { name: 'gemini-2.5-pro' },
          { name: 'gemini-2.5-flash' },
          { name: 'gemini-2.5-flash-lite' },
          { name: 'gemini-2.0-flash' },
          { name: 'gemini-2.0-flash-lite' }
        ]
      }
    }
  }),
  createSupplier({
    id: 7,
    name: 'OpenAI',
    i18nKey: 'supplier.openai',
    icon: icon_openai_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.openai.com/v1',
        common_args: [{ key: 'temperature', val: 1.0, type: 'number', range: '[0, 2]' }],
        model_options: [
          { name: 'gpt-4.1' },
          { name: 'gpt-4.1-mini' },
          { name: 'gpt-4.1-nano' },
          { name: 'gpt-4o' },
          { name: 'gpt-4o-mini' },
          { name: 'chatgpt-4o' },
          { name: 'o4-mini' },
          { name: 'o4-mini-deep-research' },
          { name: 'o3' },
          { name: 'o3-pro' },
          { name: 'o3-mini' },
          { name: 'o3-deep-research' },
          { name: 'o1' },
          { name: 'o1-pro' },
          { name: 'o1-mini' }
        ]
      }
    }
  }),
  createSupplier({
    id: 8,
    name: 'Kimi',
    i18nKey: 'supplier.kimi',
    icon: icon_kimi_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.moonshot.cn/v1',
        common_args: [{ key: 'temperature', val: 0.3, type: 'number', range: '[0, 1]' }],
        model_options: [
          { name: 'kimi-k2-0711-preview' },
          { name: 'kimi-k2-turbo-preview' },
          { name: 'moonshot-v1-8k' },
          { name: 'moonshot-v1-32k' },
          { name: 'moonshot-v1-128k' },
          { name: 'moonshot-v1-auto' },
          { name: 'kimi-latest' },
          { name: 'moonshot-v1-8k-vision-preview' },
          { name: 'moonshot-v1-32k-vision-preview' },
          { name: 'moonshot-v1-128k-vision-preview' },
          { name: 'kimi-thinking-preview' }
        ]
      }
    }
  }),
  createSupplier({
    id: 9,
    name: '腾讯云',
    i18nKey: 'supplier.tencent_cloud',
    icon: icon_txy_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.lkeap.cloud.tencent.com/v1',
        common_args: [{ key: 'temperature', val: 0.6, type: 'number', range: '[0, 1]' }],
        model_options: [
          { name: 'deepseek-r1' },
          { name: 'deepseek-r1-0528' },
          { name: 'deepseek-v3' },
          { name: 'deepseek-v3-0324' }
        ]
      }
    }
  }),
  createSupplier({
    id: 10,
    name: '火山引擎',
    i18nKey: 'supplier.volcano_engine',
    icon: icon_hsyq_colorful,
    model_config: {
      0: {
        api_domain: 'https://ark.cn-beijing.volces.com/api/v3',
        common_args: [{ key: 'temperature', val: 0.6, type: 'number', range: '[0, 1]' }],
        model_options: [
          { name: 'doubao-seed-1-6-250615' },
          { name: 'doubao-seed-1-6-flash-250715' },
          { name: 'doubao-1-5-pro-32k-character-250715' },
          { name: 'kimi-k2-250711' },
          { name: 'deepseek-v3-250324' },
          { name: 'deepseek-r1' }
        ]
      }
    }
  }),
  createSupplier({
    id: 13,
    name: 'MiniMax',
    i18nKey: 'supplier.minimax',
    icon: icon_minimax_colorful,
    model_config: {
      0: {
        api_domain: 'https://api.minimax.io/v1',
        common_args: [{ key: 'temperature', val: 0.7, type: 'number', range: '[0, 1]' }],
        model_options: [
          { name: 'MiniMax-M2.7' },
          { name: 'MiniMax-M2.5' },
          { name: 'MiniMax-M2.5-highspeed' }
        ]
      }
    }
  }),
  createSupplier({
    id: 15,
    name: '通用OpenAI',
    i18nKey: 'supplier.generic_openai',
    is_private: true,
    icon: icon_common_openai,
    model_config: {
      0: {
        api_domain: 'http://127.0.0.1:8000/v1',
        common_args: [{ key: 'temperature', val: 0.6, type: 'number', range: '[0, 1]' }],
        model_options: [
          { name: 'gpt-4.1' },
          { name: 'gpt-4.1-mini' },
          { name: 'gpt-4.1-nano' },
          { name: 'gpt-4o' },
          { name: 'gpt-4o-mini' },
          { name: 'chatgpt-4o' },
          { name: 'o4-mini' },
          { name: 'o4-mini-deep-research' },
          { name: 'o3' },
          { name: 'o3-pro' },
          { name: 'o3-mini' },
          { name: 'o3-deep-research' },
          { name: 'o1' },
          { name: 'o1-pro' },
          { name: 'o1-mini' }
        ]
      }
    }
  })
]

export const get_supplier = (supplierId: number | string) => {
  const tv = Number(supplierId)
  return supplierList.find(item => item.id === tv)
}

export const base_model_options = (supplierId: number | string, modelType?: number) => {
  const supplier = get_supplier(supplierId)
  return supplier?.model_config[modelType || 0]?.model_options || []
}

export const getSupplierName = (value: any) => {
  return get_supplier(value)?.label || ''
}
