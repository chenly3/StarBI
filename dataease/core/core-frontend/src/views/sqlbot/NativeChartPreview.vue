<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  BarChart,
  LineChart,
  PieChart,
  SVGRenderer
])

type ChartType = 'table' | 'column' | 'bar' | 'line' | 'pie'

interface ChartAxis {
  name?: string
  value?: string
  type?: 'x' | 'y' | 'series' | 'other-info'
  ['multi-quota']?: boolean
}

interface ChartConfig {
  type?: ChartType
  title?: string
  columns?: ChartAxis[]
  axis?: {
    x?: ChartAxis
    y?: ChartAxis | ChartAxis[]
    series?: ChartAxis
    'multi-quota'?: {
      name?: string
      value?: string[]
    }
  }
}

interface ChartDatasetField {
  name?: string
  value?: string
}

interface ChartDataset {
  fields?: Array<ChartDatasetField | string>
  data?: Record<string, any>[]
}

interface CheckedData {
  isPercent: boolean
  data: Array<Record<string, any>>
}

interface CartesianPayload {
  rows: Array<Record<string, any>>
  categories: string[]
  values: number[]
  xField: string
  xName: string
  yField: string
  yName: string
  isPercent: boolean
}

interface PiePayload {
  rows: Array<Record<string, any>>
  categoryField: string
  valueField: string
  valueName: string
  isPercent: boolean
}

const COLOR_SET = ['#4C7CFF', '#57B7FF', '#7BD88F', '#F6C56F', '#A78BFA', '#F28B82']

const props = withDefaults(
  defineProps<{
    chart?: string | Record<string, any> | null
    dataset?: ChartDataset | null
    height?: number
    showLabel?: boolean
  }>(),
  {
    chart: null,
    dataset: null,
    height: 320,
    showLabel: true
  }
)

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const chartConfig = computed<ChartConfig>(() => {
  if (!props.chart) {
    return {}
  }
  if (typeof props.chart === 'string') {
    try {
      return JSON.parse(props.chart)
    } catch (error) {
      console.error('parse chart config failed', error)
      return {}
    }
  }
  return props.chart as ChartConfig
})

const rows = computed<Record<string, any>[]>(() => props.dataset?.data || [])
const chartType = computed<ChartType>(() => chartConfig.value.type || 'table')
const isTable = computed(() => chartType.value === 'table')

const chartHeightStyle = computed(() => ({
  height: `${props.height}px`
}))

const effectiveShowLabel = computed(() => {
  if (!props.showLabel) {
    return false
  }
  if (chartType.value === 'line' && rows.value.length > 12) {
    return false
  }
  return true
})

const tableColumns = computed(() => {
  const configColumns = chartConfig.value.columns || []
  if (configColumns.length) {
    return configColumns
      .map(item => ({
        key: item.value || item.name || '',
        label: item.name || item.value || ''
      }))
      .filter(item => item.key)
  }

  const fieldList = props.dataset?.fields || []
  return fieldList
    .map(item => {
      if (typeof item === 'string') {
        return { key: item, label: item }
      }
      const key = item.value || item.name || ''
      return { key, label: item.name || item.value || key }
    })
    .filter(item => item.key)
})

const normalizeNumber = (value: any) => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    const numericValue = Number(value.trim().slice(0, -1))
    return Number.isFinite(numericValue) ? numericValue : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatValue = (value: any, isPercent = false) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  return `${value}${isPercent ? '%' : ''}`
}

const getAxesWithFilter = (axes: ChartAxis[]) => {
  const groups = {
    x: [] as ChartAxis[],
    y: [] as ChartAxis[],
    series: [] as ChartAxis[],
    multiQuota: [] as string[],
    multiQuotaName: undefined as string | undefined
  }

  axes.forEach(axis => {
    if (axis.type === 'x') {
      groups.x.push(axis)
    } else if (axis.type === 'y') {
      groups.y.push(axis)
    } else if (axis.type === 'series') {
      groups.series.push(axis)
    } else if (axis.type === 'other-info') {
      groups.multiQuotaName = axis.value
    }
  })

  if (groups.series.length > 0) {
    groups.y = groups.y.slice(0, 1)
  } else {
    const multiQuotaY = groups.y.filter(item => item['multi-quota'] === true)
    groups.multiQuota = multiQuotaY.map(item => item.value || '')
    if (multiQuotaY.length > 0) {
      groups.y = multiQuotaY
    }
  }

  return groups
}

const checkIsPercent = (
  valueAxes: Array<ChartAxis>,
  data: Array<Record<string, any>>
): CheckedData => {
  const result: CheckedData = {
    isPercent: false,
    data: data.map(item => ({ ...item }))
  }

  const hasPercentValue = valueAxes.some(valueAxis => {
    if (!valueAxis.value) {
      return false
    }
    const sample = data.find(item => {
      const value = item?.[valueAxis.value || '']
      return value !== null && value !== undefined && value !== '' && value !== 0 && value !== '0'
    })
    return (
      typeof sample?.[valueAxis.value] === 'string' && sample[valueAxis.value].trim().endsWith('%')
    )
  })

  if (!hasPercentValue) {
    return result
  }

  result.isPercent = true
  result.data.forEach(item => {
    valueAxes.forEach(axis => {
      if (!axis.value) {
        return
      }
      const value = item[axis.value]
      if (typeof value === 'string' && value.trim().endsWith('%')) {
        item[axis.value] = normalizeNumber(value)
      }
    })
  })

  return result
}

const normalizedAxes = computed<ChartAxis[]>(() => {
  const axes: ChartAxis[] = []
  const configColumns = chartConfig.value.columns || []
  configColumns.forEach(column => {
    axes.push({
      name: column.name,
      value: column.value,
      type: column.type
    })
  })

  const axis = chartConfig.value.axis || {}
  if (axis.x?.value) {
    axes.push({
      name: axis.x.name,
      value: axis.x.value,
      type: 'x'
    })
  }
  const yAxisList = axis.y ? (Array.isArray(axis.y) ? axis.y : [axis.y]) : []
  yAxisList.forEach(item => {
    if (!item?.value) {
      return
    }
    axes.push({
      name: item.name,
      value: item.value,
      type: 'y',
      'multi-quota': axis['multi-quota']?.value?.includes(item.value)
    })
  })
  if (axis.series?.value) {
    axes.push({
      name: axis.series.name,
      value: axis.series.value,
      type: 'series'
    })
  }

  return axes
})

const cartesianPayload = computed<CartesianPayload | null>(() => {
  const groupedAxes = getAxesWithFilter(normalizedAxes.value)
  const xAxis = groupedAxes.x[0]
  const yAxis = groupedAxes.y[0]

  if (!xAxis?.value || !yAxis?.value || !rows.value.length) {
    return null
  }

  const checkedData = checkIsPercent([yAxis], rows.value)

  return {
    rows: checkedData.data,
    categories: checkedData.data.map(item => String(item[xAxis.value || ''] ?? '')),
    values: checkedData.data.map(item => normalizeNumber(item[yAxis.value || ''])),
    xField: xAxis.value,
    xName: xAxis.name || xAxis.value,
    yField: yAxis.value,
    yName: yAxis.name || yAxis.value,
    isPercent: checkedData.isPercent
  }
})

const piePayload = computed<PiePayload | null>(() => {
  const axis = chartConfig.value.axis || {}
  const yAxis = Array.isArray(axis.y) ? axis.y[0] : axis.y
  const categoryField = axis.series?.value || axis.x?.value || ''
  const valueField = yAxis?.value || ''

  if (!categoryField || !valueField || !rows.value.length) {
    return null
  }

  const checkedData = checkIsPercent(
    [
      {
        name: yAxis?.name || valueField,
        value: valueField,
        type: 'y'
      }
    ],
    rows.value
  )

  return {
    rows: checkedData.data,
    categoryField,
    valueField,
    valueName: yAxis?.name || valueField,
    isPercent: checkedData.isPercent
  }
})

const buildCartesianOption = (): EChartsOption | null => {
  if (!cartesianPayload.value) {
    return null
  }

  const baseOption: EChartsOption = {
    animation: false,
    color: COLOR_SET,
    grid: {
      top: 28,
      right: 20,
      bottom: 44,
      left: 52,
      containLabel: true
    },
    tooltip: {
      trigger: chartType.value === 'line' ? 'axis' : 'item',
      backgroundColor: 'rgba(17, 24, 39, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#fff',
        fontSize: 13
      },
      formatter: params => {
        const item = Array.isArray(params) ? params[0] : params
        if (!item) {
          return ''
        }
        const name = String(item.name ?? '')
        const value = Array.isArray(item.value) ? item.value[1] : item.value
        return `${name}<br/>${cartesianPayload.value?.yName}：${formatValue(
          value,
          cartesianPayload.value?.isPercent
        )}`
      }
    },
    xAxis: {
      type: chartType.value === 'bar' ? 'value' : 'category',
      data: chartType.value === 'bar' ? undefined : cartesianPayload.value.categories,
      axisLine: {
        lineStyle: {
          color: '#CBD5E1'
        }
      },
      axisLabel: {
        color: '#4B6382',
        fontSize: 12
      },
      splitLine: {
        show: chartType.value === 'bar',
        lineStyle: {
          color: 'rgba(226, 232, 240, 0.9)'
        }
      }
    },
    yAxis: {
      type: chartType.value === 'bar' ? 'category' : 'value',
      data: chartType.value === 'bar' ? cartesianPayload.value.categories : undefined,
      axisLine: {
        show: chartType.value === 'bar',
        lineStyle: {
          color: '#CBD5E1'
        }
      },
      axisLabel: {
        color: '#4B6382',
        fontSize: 12
      },
      splitLine: {
        show: chartType.value !== 'bar',
        lineStyle: {
          color: 'rgba(226, 232, 240, 0.9)'
        }
      }
    }
  }

  if (chartType.value === 'line') {
    baseOption.series = [
      {
        type: 'line',
        smooth: true,
        data: cartesianPayload.value.values,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: effectiveShowLabel.value
          ? {
              show: true,
              position: 'top',
              color: '#1D2A52',
              fontSize: 12,
              fontWeight: 600,
              formatter: ({ value }) => formatValue(value, cartesianPayload.value?.isPercent)
            }
          : undefined
      }
    ]
    return baseOption
  }

  if (chartType.value === 'bar') {
    baseOption.series = [
      {
        type: 'bar',
        data: cartesianPayload.value.values,
        barMaxWidth: 28,
        itemStyle: {
          borderRadius: [0, 8, 8, 0]
        },
        label: effectiveShowLabel.value
          ? {
              show: true,
              position: 'right',
              color: '#1D2A52',
              fontSize: 12,
              fontWeight: 600,
              formatter: ({ value }) => formatValue(value, cartesianPayload.value?.isPercent)
            }
          : undefined
      }
    ]
    return baseOption
  }

  baseOption.series = [
    {
      type: 'bar',
      data: cartesianPayload.value.values,
      barMaxWidth: 32,
      itemStyle: {
        borderRadius: [8, 8, 0, 0]
      },
      label: effectiveShowLabel.value
        ? {
            show: true,
            position: 'top',
            color: '#1D2A52',
            fontSize: 12,
            fontWeight: 600,
            formatter: ({ value }) => formatValue(value, cartesianPayload.value?.isPercent)
          }
        : undefined
    }
  ]
  return baseOption
}

const buildPieOption = (): EChartsOption | null => {
  if (!piePayload.value) {
    return null
  }

  return {
    animation: false,
    color: COLOR_SET,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 24, 39, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#fff',
        fontSize: 13
      },
      formatter: params => {
        const value = (params as any)?.value
        return `${params.name}<br/>${piePayload.value?.valueName}：${formatValue(
          value,
          piePayload.value?.isPercent
        )}`
      }
    },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: '#4B6382',
        fontSize: 12,
        fontWeight: 500
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: effectiveShowLabel.value
          ? {
              show: true,
              color: '#28456F',
              fontSize: 12,
              fontWeight: 600,
              formatter: ({ name, value }) =>
                `${name}\n${formatValue(value, piePayload.value?.isPercent)}`
            }
          : {
              show: false
            },
        data: piePayload.value.rows.map(item => ({
          name: String(item[piePayload.value?.categoryField || ''] ?? ''),
          value: normalizeNumber(item[piePayload.value?.valueField || ''])
        }))
      }
    ]
  }
}

const renderChart = async () => {
  if (isTable.value) {
    chartInstance?.dispose()
    chartInstance = null
    return
  }

  const option = chartType.value === 'pie' ? buildPieOption() : buildCartesianOption()
  if (!option) {
    chartInstance?.dispose()
    chartInstance = null
    return
  }

  await nextTick()
  if (!chartRef.value) {
    return
  }

  chartInstance?.dispose()
  chartInstance = echarts.init(chartRef.value, undefined, {
    renderer: 'svg'
  })
  chartInstance.setOption(option, true)
  chartInstance.resize()
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(
  () => [props.chart, props.dataset, props.height, props.showLabel],
  () => {
    void renderChart()
  },
  { deep: true }
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  void renderChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div class="native-chart-preview">
    <div v-if="isTable" class="native-chart-table" :style="chartHeightStyle">
      <el-table :data="rows" height="100%" size="small" border>
        <el-table-column
          v-for="column in tableColumns"
          :key="column.key"
          :prop="column.key"
          :label="column.label"
          min-width="120"
          show-overflow-tooltip
        />
      </el-table>
    </div>
    <div v-else ref="chartRef" class="native-chart-canvas" :style="chartHeightStyle"></div>
  </div>
</template>

<style lang="less" scoped>
.native-chart-preview {
  width: 100%;
}

.native-chart-table,
.native-chart-canvas {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
}

.native-chart-canvas {
  padding: 12px 12px 4px;
}

:deep(.native-chart-canvas > div),
:deep(.native-chart-canvas svg) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.native-chart-table .el-table) {
  --el-table-border-color: rgba(226, 232, 240, 0.9);
  --el-table-header-bg-color: rgba(248, 250, 252, 1);
  font-size: 13px;
}

:deep(.native-chart-table .el-table th),
:deep(.native-chart-table .el-table td) {
  color: #28456f;
}
</style>
