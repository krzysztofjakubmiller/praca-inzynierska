import { BASIC_GRAPH, type BasicStationId } from './basic/graph'
import { BASIC_LAYOUT } from './basic/layout'
import { BASIC_SKETCHES } from './basic/sketches'
import { EXTENDED_GRAPH, type ExtendedStationId } from './extended/graph'
import { EXTENDED_LAYOUT } from './extended/layout'
import { EXTENDED_SKETCHES } from './extended/sketches'
import type { TopicMap } from './types'

export const BASIC_MAP: TopicMap<BasicStationId> = {
  examId: 'matura-podstawowa',
  graph: BASIC_GRAPH,
  layout: BASIC_LAYOUT,
  sketches: BASIC_SKETCHES,
}

export const EXTENDED_MAP: TopicMap<ExtendedStationId> = {
  examId: 'matura-rozszerzona',
  graph: EXTENDED_GRAPH,
  layout: EXTENDED_LAYOUT,
  sketches: EXTENDED_SKETCHES,
}

export const TOPIC_MAPS: readonly TopicMap[] = [BASIC_MAP, EXTENDED_MAP]
