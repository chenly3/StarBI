# Graph Report - /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new  (2026-04-17)

## Corpus Check
- 12 files · ~21,278 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 64 nodes · 72 edges · 18 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `buildHistorySessionKey()` - 4 edges
2. `uniqueFieldNames()` - 4 edges
3. `extractDatasetDetailFieldNames()` - 4 edges
4. `extractDatasetDetailMetricNames()` - 4 edges
5. `extractDatasetDetailDimensionNames()` - 4 edges
6. `loadPreviewDetail()` - 4 edges
7. `explainSqlbotNewError()` - 3 edges
8. `parseSqlbotErrorPayload()` - 2 edges
9. `normalizeSqlbotNewErrorCopy()` - 2 edges
10. `buildFallbackRecommendQuestions()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (2): normalizeDatasetTree(), normalizeTree()

### Community 2 - "Community 2"
Cohesion: 0.39
Nodes (6): formatTime(), getFieldKind(), getFieldTypeLabel(), loadPreviewDetail(), resetPreviewState(), retryPreview()

### Community 3 - "Community 3"
Cohesion: 0.47
Nodes (6): extractDatasetDetailDimensionNames(), extractDatasetDetailFieldNames(), extractDatasetDetailMetricNames(), inferDimensionFields(), inferMetricFields(), uniqueFieldNames()

### Community 4 - "Community 4"
Cohesion: 0.4
Nodes (0): 

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): buildHistorySessionKey(), readHistorySessionSnapshot(), removeHistorySessionSnapshot(), writeHistorySessionSnapshot()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (3): explainSqlbotNewError(), normalizeSqlbotNewErrorCopy(), parseSqlbotErrorPayload()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): readDatasourceDatasetCache(), useSqlbotNewConversation()

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (2): buildFallbackRecommendQuestions(), resolveQuestionClarification()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): normalizeDatasetFieldName(), normalizeFieldLabel()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 9`** (2 nodes): `readDatasourceDatasetCache()`, `useSqlbotNewConversation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `buildFallbackRecommendQuestions()`, `resolveQuestionClarification()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `normalizeDatasetFieldName()`, `normalizeFieldLabel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `if()`, `SqlbotNewSelectDataDialog.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `index.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `SqlbotNewTopbar.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `SqlbotNewDatasetDetailDialog.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `SqlbotNewConversationRecord.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildHistorySessionKey()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `extractDatasetDetailMetricNames()` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._