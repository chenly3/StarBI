import { mount } from '@vue/test-utils'
import LearningStatusTag from '../components/LearningStatusTag.vue'

export const assertLearningStatusTagRendersSuccess = () => {
  const wrapper = mount(LearningStatusTag, {
    props: { status: '学习成功' }
  })

  if (!wrapper.text().includes('学习成功')) {
    throw new Error(`expected wrapper text to include 学习成功, received ${wrapper.text()}`)
  }
}
