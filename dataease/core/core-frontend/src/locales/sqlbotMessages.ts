type SqlbotLocale = 'zh-CN' | 'en' | 'tw'
type MessageTree = Record<string, any>

const sqlbotFlatMessages: Record<string, Record<SqlbotLocale, string>> = {
  'starbi.ai_config_center': {
    'zh-CN': 'AI 配置中心',
    en: 'AI settings center',
    tw: 'AI 設定中心'
  },
  'starbi.ai_config_center_desc': {
    'zh-CN': '统一维护模型、术语和 SQL 示例库，作为智能问数的通用配置入口。',
    en: 'Maintain models, terminology, and SQL examples in one place as the common settings entry for AI query.',
    tw: '統一維護模型、術語與 SQL 範例庫，作為智能問數的通用設定入口。'
  },
  'starbi.ai_config_group': {
    'zh-CN': '通用配置',
    en: 'General settings',
    tw: '通用設定'
  },
  'starbi.ai_model_config': {
    'zh-CN': 'AI 模型配置',
    en: 'AI model settings',
    tw: 'AI 模型設定'
  },
  'starbi.ai_model_config_desc': {
    'zh-CN': '统一管理 StarBI 智能问数使用的模型与默认能力。',
    en: 'Manage the models and default capabilities used by StarBI AI query.',
    tw: '統一管理 StarBI 智能問數使用的模型與預設能力。'
  },
  'starbi.sql_example_config': {
    'zh-CN': 'SQL 示例库',
    en: 'SQL example library',
    tw: 'SQL 範例庫'
  },
  'starbi.sql_example_config_desc': {
    'zh-CN': '维护高质量 SQL 示例，增强 Text-to-SQL 生成效果。',
    en: 'Maintain high-quality SQL examples to improve Text-to-SQL generation.',
    tw: '維護高品質 SQL 範例，增強 Text-to-SQL 生成效果。'
  },
  'starbi.term_config': {
    'zh-CN': '术语配置',
    en: 'Terminology settings',
    tw: '術語設定'
  },
  'starbi.term_config_desc': {
    'zh-CN': '维护业务术语和同义词，提升 StarBI 问数理解能力。',
    en: 'Maintain business terms and synonyms to improve StarBI query understanding.',
    tw: '維護業務術語與同義詞，提升 StarBI 問數理解能力。'
  },
  'starbi.query_config_resource_manage': {
    'zh-CN': '问数资源管理',
    en: 'Query resource management',
    tw: '問數資源管理'
  },
  'starbi.query_config_subtitle': {
    'zh-CN': '统一管理问数资源与分析主题，作为系统设置下的智能问数配置入口。',
    en: 'Manage query resources and analysis themes in system settings.',
    tw: '統一管理問數資源與分析主題，作為系統設定下的智能問數設定入口。'
  },
  'starbi.query_config_theme_manage': {
    'zh-CN': '分析主题管理',
    en: 'Analysis theme management',
    tw: '分析主題管理'
  },
  'starbi.query_config_title': {
    'zh-CN': '问数配置',
    en: 'Query settings',
    tw: '問數設定'
  },
  'common.as_default_model': {
    'zh-CN': '设为默认模型',
    en: 'Set as Default Model',
    tw: '设为默认模型'
  },
  'common.cancel': {
    'zh-CN': '取消',
    en: 'Cancel',
    tw: '取消'
  },
  'common.empty': {
    'zh-CN': '',
    en: ' ',
    tw: ''
  },
  'common.no_model_yet': {
    'zh-CN': '暂无模型',
    en: 'No model yet',
    tw: '暂无模型'
  },
  'common.save': {
    'zh-CN': '保存',
    en: 'Save',
    tw: '保存'
  },
  'common.save_success': {
    'zh-CN': '保存成功',
    en: 'Save Successful',
    tw: '保存成功'
  },
  'common.the_default_model': {
    'zh-CN': '已是默认模型',
    en: 'Already the default model',
    tw: '已是默认模型'
  },
  'dashboard.create_time': {
    'zh-CN': '创建时间',
    en: 'Create Time',
    tw: '创建时间'
  },
  'dashboard.delete': {
    'zh-CN': '删除',
    en: 'Delete',
    tw: '删除'
  },
  'dashboard.delete_success': {
    'zh-CN': '删除成功',
    en: 'Successfully deleted',
    tw: '删除成功'
  },
  'dashboard.edit': {
    'zh-CN': '编辑',
    en: 'Edit',
    tw: '编辑'
  },
  'datasource.Please_select': {
    'zh-CN': '请选择',
    en: 'Please select',
    tw: '请选择'
  },
  'datasource.confirm': {
    'zh-CN': '确定',
    en: 'Confirm',
    tw: '确定'
  },
  'datasource.copy': {
    'zh-CN': '复制',
    en: 'Copy',
    tw: '复制'
  },
  'datasource.edit': {
    'zh-CN': '编辑',
    en: 'Edit',
    tw: '编辑'
  },
  'datasource.got_it': {
    'zh-CN': '知道了',
    en: 'Got it',
    tw: '知道了'
  },
  'datasource.please_enter': {
    'zh-CN': '请输入',
    en: 'Please enter',
    tw: '请输入'
  },
  'datasource.relevant_content_found': {
    'zh-CN': '没有找到相关内容',
    en: 'No relevant content found',
    tw: '没有找到相关内容'
  },
  'datasource.retry': {
    'zh-CN': '重试',
    en: 'Retry',
    tw: '重試'
  },
  'datasource.search': {
    'zh-CN': '搜索',
    en: 'Search',
    tw: '搜索'
  },
  'datasource.search_by_name': {
    'zh-CN': '通过名称搜索',
    en: 'Search by Name',
    tw: '通过名称搜索'
  },
  'datasource.select_all': {
    'zh-CN': '全选',
    en: 'Select all',
    tw: '全选'
  },
  'ds.actions': {
    'zh-CN': '操作',
    en: 'Actions',
    tw: '操作'
  },
  'ds.previous': {
    'zh-CN': '上一步',
    en: 'Previous',
    tw: '上一步'
  },
  'ds.status': {
    'zh-CN': '状态',
    en: 'Status',
    tw: '状态'
  },
  'ds.title': {
    'zh-CN': '数据源',
    en: 'Data Sources',
    tw: '数据源'
  },
  'embedded.advanced_application': {
    'zh-CN': '高级应用',
    en: 'Advanced app',
    tw: '高级应用'
  },
  'embedded.copy_failed': {
    'zh-CN': '复制失败',
    en: 'Copy failed',
    tw: '复制失败'
  },
  'embedded.copy_successful': {
    'zh-CN': '复制成功',
    en: 'Copy successful',
    tw: '复制成功'
  },
  'embedded.duplicate_name': {
    'zh-CN': '重复名称',
    en: 'Duplicate name',
    tw: '重复名称'
  },
  'embedded.repeating_parameters': {
    'zh-CN': '重复参数',
    en: 'Duplicate Parameter',
    tw: '重复参数'
  },
  'model.add': {
    'zh-CN': '添加',
    en: 'Add',
    tw: '添加'
  },
  'model.add_model': {
    'zh-CN': '添加模型',
    en: 'Add model',
    tw: '添加模型'
  },
  'model.advanced_settings': {
    'zh-CN': '高级设置',
    en: 'Advanced settings',
    tw: '高级设置'
  },
  'model.ai_model_configuration': {
    'zh-CN': 'AI 模型配置',
    en: 'AI model config',
    tw: 'AI 模型配置'
  },
  'model.api_domain_name': {
    'zh-CN': 'API 域名',
    en: 'API domain name',
    tw: 'API 域名'
  },
  'model.basic_model': {
    'zh-CN': '基础模型',
    en: 'Basic model',
    tw: '基础模型'
  },
  'model.custom_model_name': {
    'zh-CN': '自定义的模型名称',
    en: 'Custom model name',
    tw: '自定义的模型名称'
  },
  'model.default_model': {
    'zh-CN': '默认模型',
    en: 'Default model',
    tw: '默认模型'
  },
  'model.del_default_tip': {
    'zh-CN': '无法删除模型: {msg}',
    en: 'Unable to delete the model: {msg}',
    tw: '无法删除模型: {msg}'
  },
  'model.del_default_warn': {
    'zh-CN': '该模型为系统默认模型，请先设置其他模型为系统默认模型，再删除此模型。',
    en: 'This model is the system default model. Please set another model as the system default before deleting this model.',
    tw: '该模型为系统默认模型，请先设置其他模型为系统默认模型，再删除此模型。'
  },
  'model.del_warn_tip': {
    'zh-CN': '是否删除模型: {msg}？',
    en: 'Would you like to remove the model: {msg}？',
    tw: '是否删除模型: {msg}？'
  },
  'model.display_name': {
    'zh-CN': '显示名称',
    en: 'Display name',
    tw: '显示名称'
  },
  'model.enter_to_add': {
    'zh-CN': '列表中未列出的模型，直接输入模型名称，回车即可添加',
    en: 'For models not listed in the list, just enter the model name and press Enter to add',
    tw: '列表中未列出的模型，直接输入模型名称，回车即可添加'
  },
  'model.length_max_error': {
    'zh-CN': '{msg}长度不能超过{max}个字符',
    en: '{msg} is limited to {max} characters',
    tw: '{msg}长度不能超过{max}个字符'
  },
  'model.model_name': {
    'zh-CN': '模型名称',
    en: 'Model name',
    tw: '模型名称'
  },
  'model.model_parameters': {
    'zh-CN': '模型参数',
    en: 'Model parameters',
    tw: '模型参数'
  },
  'model.model_type': {
    'zh-CN': '模型类型',
    en: 'Model type',
    tw: '模型类型'
  },
  'model.operate_with_caution': {
    'zh-CN': '系统默认模型被替换后，智能问数的结果将会受到影响，请谨慎操作。',
    en: 'After the system default model is replaced, the result of intelligent question will be affected, please operate with caution.',
    tw: '系统默认模型被替换后，智能问数的结果将会受到影响，请谨慎操作。'
  },
  'model.parameter_value': {
    'zh-CN': '参数值',
    en: 'Parameter value',
    tw: '参数值'
  },
  'model.parameters': {
    'zh-CN': '参数',
    en: 'Parameter',
    tw: '参数'
  },
  'model.relevant_results_found': {
    'zh-CN': '没有找到相关结果',
    en: 'No relevant results found',
    tw: '没有找到相关结果'
  },
  'model.select_supplier': {
    'zh-CN': '选择供应商',
    en: 'Select supplier',
    tw: '选择供应商'
  },
  'model.set_successfully': {
    'zh-CN': '设置成功',
    en: 'Set successfully',
    tw: '设置成功'
  },
  'model.system_default_model': {
    'zh-CN': '是否设置 {msg} 为系统默认模型？',
    en: 'Do you want to set {msg} as the system default model?',
    tw: '是否设置 {msg} 为系统默认模型？'
  },
  'model.system_default_model_de': {
    'zh-CN': '系统默认模型',
    en: 'System default model',
    tw: '系统默认模型'
  },
  'model.the_basic_model': {
    'zh-CN': '请给基础模型设置一个名称',
    en: 'Please set a name for the basic model',
    tw: '请给基础模型设置一个名称'
  },
  'model.the_basic_model_de': {
    'zh-CN': '请选择基础模型',
    en: 'Please select the basic model',
    tw: '请选择基础模型'
  },
  'modelType.llm': {
    'zh-CN': '大语言模型',
    en: 'Large Language Model',
    tw: '大语言模型'
  },
  'professional.business_term': {
    'zh-CN': '业务术语',
    en: 'Business Term',
    tw: '业务术语'
  },
  'professional.cannot_be_repeated': {
    'zh-CN': '术语名称，同义词不能重复',
    en: 'Term name, synonyms cannot be repeated',
    tw: '术语名称，同义词不能重复'
  },
  'professional.create_new_term': {
    'zh-CN': '新建术语',
    en: 'Create New Term',
    tw: '新建术语'
  },
  'professional.editing_terminology': {
    'zh-CN': '编辑术语',
    en: 'Editing Terminology',
    tw: '编辑术语'
  },
  'professional.export': {
    'zh-CN': '导出',
    en: 'Export',
    tw: '导出'
  },
  'professional.export_all': {
    'zh-CN': '全部导出',
    en: 'Export All',
    tw: '全部导出'
  },
  'professional.export_hint': {
    'zh-CN': '是否导出全部术语？',
    en: 'Export all terms?',
    tw: '是否导出全部术语？'
  },
  'professional.no_term': {
    'zh-CN': '暂无术语',
    en: 'No Term',
    tw: '暂无术语'
  },
  'professional.professional_term_details': {
    'zh-CN': '专业术语详情',
    en: 'Professional Term Details',
    tw: '专业术语详情'
  },
  'professional.professional_terminology': {
    'zh-CN': '术语配置',
    en: 'Terminology Config',
    tw: '术语配置'
  },
  'professional.search_term': {
    'zh-CN': '搜索术语',
    en: 'Search Term',
    tw: '搜索术语'
  },
  'professional.selected_2_terms': {
    'zh-CN': '是否删除选中的 {msg} 条术语？',
    en: 'Delete the selected {msg} terms?',
    tw: '是否删除选中的 {msg} 条术语？'
  },
  'professional.synonyms': {
    'zh-CN': '同义词',
    en: 'Synonyms',
    tw: '同义词'
  },
  'professional.term_description': {
    'zh-CN': '术语描述',
    en: 'Term Description',
    tw: '术语描述'
  },
  'professional.term_name': {
    'zh-CN': '术语名称',
    en: 'Term Name',
    tw: '术语名称'
  },
  'professional.the_term_gmv': {
    'zh-CN': '是否删除术语：{msg}？',
    en: 'Delete the term: {msg}?',
    tw: '是否删除术语：{msg}？'
  },
  'prompt.add_sql_sample': {
    'zh-CN': '添加 SQL 示例',
    en: 'Add SQL sample',
    tw: '添加 SQL 示例'
  },
  'qa.no_data': {
    'zh-CN': '暂无数据',
    en: 'No data available',
    tw: '暂无数据'
  },
  'supplier.alibaba_cloud_bailian': {
    'zh-CN': '阿里云百炼',
    en: 'Alibaba Cloud Bailian',
    tw: '阿里云百炼'
  },
  'supplier.deepseek': {
    'zh-CN': 'DeepSeek',
    en: 'DeepSeek',
    tw: 'DeepSeek'
  },
  'supplier.gemini': {
    'zh-CN': 'Gemini',
    en: 'Gemini',
    tw: 'Gemini'
  },
  'supplier.generic_openai': {
    'zh-CN': '通用OpenAI',
    en: 'Generic OpenAI',
    tw: '通用OpenAI'
  },
  'supplier.iflytek_spark': {
    'zh-CN': '讯飞星火',
    en: 'iFlytek Spark',
    tw: '讯飞星火'
  },
  'supplier.kimi': {
    'zh-CN': 'Kimi',
    en: 'Kimi',
    tw: 'Kimi'
  },
  'supplier.minimax': {
    'zh-CN': 'MiniMax',
    en: 'MiniMax',
    tw: 'MiniMax'
  },
  'supplier.openai': {
    'zh-CN': 'OpenAI',
    en: 'OpenAI',
    tw: 'OpenAI'
  },
  'supplier.qianfan_model': {
    'zh-CN': '千帆大模型',
    en: 'Qianfan Model',
    tw: '千帆大模型'
  },
  'supplier.tencent_cloud': {
    'zh-CN': '腾讯云',
    en: 'Tencent Cloud',
    tw: '腾讯云'
  },
  'supplier.tencent_hunyuan': {
    'zh-CN': '腾讯混元',
    en: 'Tencent Hunyuan',
    tw: '腾讯混元'
  },
  'supplier.volcano_engine': {
    'zh-CN': '火山引擎',
    en: 'Volcano Engine',
    tw: '火山引擎'
  },
  'training.add_training_data': {
    'zh-CN': '添加示例 SQL',
    en: 'Add SQL Sample',
    tw: '添加示例 SQL'
  },
  'training.all_data_sources': {
    'zh-CN': '所有数据源',
    en: 'All data sources',
    tw: '所有数据源'
  },
  'training.data_training': {
    'zh-CN': 'SQL 示例库',
    en: 'SQL Sample Lib',
    tw: 'SQL 示例库'
  },
  'training.edit_training_data': {
    'zh-CN': '编辑示例 SQL',
    en: 'Edit SQL Sample',
    tw: '编辑示例 SQL'
  },
  'training.effective_data_sources': {
    'zh-CN': '生效数据源',
    en: 'Effective data sources',
    tw: '生效数据源'
  },
  'training.export_hint': {
    'zh-CN': '是否导出全部示例 SQL？',
    en: 'Export all sample SQL?',
    tw: '是否导出全部示例 SQL？'
  },
  'training.partial_data_sources': {
    'zh-CN': '部分数据源',
    en: 'Partial data sources',
    tw: '部分数据源'
  },
  'training.problem_description': {
    'zh-CN': '问题描述',
    en: 'Problem Description',
    tw: '问题描述'
  },
  'training.sales_this_year': {
    'zh-CN': '是否删除示例 SQL：{msg}？',
    en: 'Do you want to delete the SQL Sample: {msg}?',
    tw: '是否删除示例 SQL：{msg}？'
  },
  'training.sample_sql': {
    'zh-CN': '示例 SQL',
    en: 'Sample SQL',
    tw: '示例 SQL'
  },
  'training.search_problem': {
    'zh-CN': '搜索问题',
    en: 'Search Problem',
    tw: '搜索问题'
  },
  'training.training_data_details': {
    'zh-CN': '示例 SQL 详情',
    en: 'SQL Sample Details',
    tw: '示例 SQL 详情'
  },
  'training.training_data_items': {
    'zh-CN': '是否删除选中的 {msg} 条示例 SQL？',
    en: 'Do you want to delete the {msg} selected SQL Sample items?',
    tw: '是否删除选中的 {msg} 条示例 SQL？'
  },
  'user.filter': {
    'zh-CN': '筛选',
    en: 'Filter',
    tw: '筛选'
  },
  'user.batch_import': {
    'zh-CN': '批量导入',
    en: 'Batch import',
    tw: '批量导入'
  },
  'user.selected_2_items': {
    'zh-CN': '已选 {msg} 条',
    en: 'Selected {msg} items',
    tw: '已选 {msg} 条'
  },
  'workspace.add_successfully': {
    'zh-CN': '添加成功',
    en: 'Add successfully',
    tw: '添加成功'
  }
}

const normalizeLocale = (locale: string): SqlbotLocale => {
  if (locale === 'en') return 'en'
  if (locale === 'tw' || locale === 'zh-TW') return 'tw'
  return 'zh-CN'
}

const setMissingMessage = (target: MessageTree, key: string, value: string) => {
  const parts = key.split('.')
  let current = target

  parts.slice(0, -1).forEach(part => {
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part]
  })

  const lastKey = parts[parts.length - 1]
  if (current[lastKey] === undefined) {
    current[lastKey] = value
  }
}

export const mergeSqlbotMessages = <T extends MessageTree>(locale: string, messages: T): T => {
  const normalizedLocale = normalizeLocale(locale)
  const mergedMessages = { ...messages }

  Object.entries(sqlbotFlatMessages).forEach(([key, translations]) => {
    setMissingMessage(mergedMessages, key, translations[normalizedLocale] || translations['zh-CN'])
  })

  return mergedMessages
}
