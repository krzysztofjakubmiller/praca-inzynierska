import { BASIC_GRAPH, type BasicStationId } from './basic/graph'
import { BASIC_LAYOUT } from './basic/layout'
import type { TopicMap } from './types'

export const BASIC_MAP: TopicMap<BasicStationId> = {
  examId: 'matura-podstawowa',
  graph: BASIC_GRAPH,
  layout: BASIC_LAYOUT,
}

export const TOPIC_MAPS: readonly TopicMap[] = [BASIC_MAP]
