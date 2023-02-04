import {
  getKeysWithNodes,
  getSetsOfKeysToCompare,
  isNodeArray,
} from '../astUtils'
import { babelParserSettings } from '../parserSettings'
import {
  PoorNodeType,
  CompareNodesParams,
  CompareNodesReturnType,
} from '../types'
import { measureStart, regExpTest } from '../utils'

const keyWithPrefix = (prefix: string) => (key: string) =>
  prefix ? `${prefix}.${key}` : key

export const compareNodes = (
  compareParams: CompareNodesParams,
): CompareNodesReturnType => {
  const {
    fileNode,
    queryNode,
    searchSettings,
    /** Params used to support comparing nodes which are not on the same level */
    queryKeysPrefix = '',
    fileKeysPrefix = '',
  } = compareParams

  const {
    mode,
    caseInsensitive,
    logger: { log, logStepEnd, logStepStart },
  } = searchSettings

  const queryKeysMapper = keyWithPrefix(queryKeysPrefix)
  const fileKeysMapper = keyWithPrefix(fileKeysPrefix)

  const measureCompare = measureStart('compare')
  logStepStart('compare')
  const isExact = mode === 'exact'

  if (!fileNode || !queryNode) {
    return {
      levelMatch: false,
      queryKeysToTraverseForValidatingMatch: [],
      fileKeysToTraverseForValidatingMatch: [],
      fileKeysToTraverseForOtherMatches: fileNode
        ? getKeysWithNodes(
            fileNode,
            Object.keys(fileNode),
            babelParserSettings.isNode,
          )
        : [],
    }
  }

  const [fileKeys, queryKeys, allFileKeys] = getSetsOfKeysToCompare(
    fileNode,
    queryNode,
    isExact,
    babelParserSettings.astPropsToSkip,
    babelParserSettings.isNodeFieldOptional,
  )

  log(
    'compare: query node type',
    queryNode.type,
    'file node type',
    fileNode.type,
  )

  log('compare: queryKeys', queryKeys)
  log('compare: fileKeys', fileKeys)

  const keysToTraverseForValidatingMatch: string[] = []
  const fileKeysToTraverseForOtherMatches: string[] = getKeysWithNodes(
    fileNode,
    /**
     * We always want to explore all other file for potential matches.
     * Even if note types are the same. Eg. Identifier might have another nested identifier node in type declaration
     */
    allFileKeys,
    babelParserSettings.isNode,
  )

  const compareUtils = {
    queryKeysMapper,
    fileKeysMapper,
    fileKeysToTraverseForOtherMatches,
    measureCompare,
  }

  babelParserSettings.sanitizeNode(fileNode)
  babelParserSettings.sanitizeNode(queryNode)

  const maybeCompareResult =
    babelParserSettings.compareNodesBeforeWildcardsComparison(
      compareParams,
      compareNodes,
      compareUtils,
    )

  if (maybeCompareResult) {
    return maybeCompareResult
  }

  const {
    isNode,
    isIdentifierNode,
    identifierTypeAnnotationFieldName,
    stringLiteralUtils,
    numericLiteralUtils,
    programNodeAndBlockNodeUtils,
    getIdentifierNodeName,
    wildcardUtils: {
      getWildcardFromNode,
      anyStringWildcardRegExp,
      patternToRegExp,
      numericWildcard,
    },
  } = babelParserSettings

  {
    /**
     * START: GENERIC MATCHERS FOR BASE WILDCARDS
     */

    /**
     *  Support for wildcards in all nodes
     */
    if (isIdentifierNode(queryNode)) {
      const wildcardMeta = getWildcardFromNode(queryNode)

      if (wildcardMeta !== null) {
        log('comparing wildcard')
        const { wildcardType, wildcardWithoutRef } = wildcardMeta
        let levelMatch

        if (wildcardType === 'nodeTree') {
          levelMatch = true
        } else {
          const regex = patternToRegExp(wildcardWithoutRef, caseInsensitive)

          levelMatch =
            isIdentifierNode(fileNode) &&
            regExpTest(regex, getIdentifierNodeName(fileNode))

          if (isExact && identifierTypeAnnotationFieldName) {
            levelMatch =
              levelMatch &&
              typeof queryNode[identifierTypeAnnotationFieldName] ===
                typeof fileNode[identifierTypeAnnotationFieldName]
          }
        }

        const queryKeysWithNodes = queryKeys.filter((key) => {
          const queryValue = queryNode[key]

          return (
            isNode(queryValue as PoorNodeType) ||
            isNodeArray(queryValue as PoorNodeType[], isNode)
          )
        })

        const queryKeysToTraverseForValidatingMatch =
          wildcardType !== 'nodeTree' ? queryKeysWithNodes : []

        measureCompare()

        return {
          levelMatch,
          queryKeysToTraverseForValidatingMatch:
            queryKeysToTraverseForValidatingMatch.map(queryKeysMapper),
          fileKeysToTraverseForValidatingMatch:
            queryKeysToTraverseForValidatingMatch.map(fileKeysMapper),
          fileKeysToTraverseForOtherMatches,
        }
      }
    }

    // this should be extracted to parser settings
    const isStringWithWildcard =
      stringLiteralUtils.isStringLiteralNode(queryNode) &&
      stringLiteralUtils.isStringLiteralNode(fileNode) &&
      regExpTest(
        anyStringWildcardRegExp,
        stringLiteralUtils.getStringLiteralValue(queryNode),
      )

    log('isStringWithWildcard', isStringWithWildcard)

    /**
     * Support for wildcards in strings
     *
     * Q: "some$$string"; C: "someBLABLAstring"; C: "somestring" // optional wildcard
     * Q: "some$$$string"; C: "someBLABLAstring"; // required wildcard
     * */
    if (isStringWithWildcard) {
      const regex = patternToRegExp(
        stringLiteralUtils.getStringLiteralValue(queryNode),
        caseInsensitive,
      )
      const levelMatch = regExpTest(
        regex,
        stringLiteralUtils.getStringLiteralValue(fileNode),
      )
      measureCompare()

      return {
        levelMatch: levelMatch,
        fileKeysToTraverseForValidatingMatch: [],
        queryKeysToTraverseForValidatingMatch: [],
        fileKeysToTraverseForOtherMatches,
      }
    }

    /*
     * Support for numeric wildcard
     * Q: 0x0; C: 123; C: 0.123
     */
    if (
      numericLiteralUtils.isNumericLiteralNode(queryNode) &&
      numericLiteralUtils.isNumericLiteralNode(fileNode) &&
      numericLiteralUtils.getNumericLiteralValue(queryNode) === numericWildcard
    ) {
      measureCompare()

      return {
        levelMatch: true,
        fileKeysToTraverseForValidatingMatch: [],
        queryKeysToTraverseForValidatingMatch: [],
        fileKeysToTraverseForOtherMatches,
      }
    }

    /*
     * Support for multi-statement search in program body
     *
     * Multi-statement query is a block with statements, we want to match such block not only with other block statements, but also with top-level program node
     */

    if (
      programNodeAndBlockNodeUtils.isBlockNode(queryNode) &&
      programNodeAndBlockNodeUtils.isProgramNode(fileNode)
    ) {
      const queryKeysToTraverseForValidatingMatch = [
        fileKeysMapper(programNodeAndBlockNodeUtils.blockNodeBodyKey),
      ]

      const fileKeysToTraverseForValidatingMatch = [
        fileKeysMapper(programNodeAndBlockNodeUtils.programNodeBodyKey),
      ]

      return {
        levelMatch: true,
        queryKeysToTraverseForValidatingMatch,
        fileKeysToTraverseForValidatingMatch,
        fileKeysToTraverseForOtherMatches,
      }
    }
    /**
     * END: GENERIC MATCHERS FOR BASE WILDCARDS
     */
  }

  const maybeCompareResultAfterGeneric =
    babelParserSettings.compareNodesAfterWildcardsComparison(
      compareParams,
      compareNodes,
      compareUtils,
    )

  if (maybeCompareResultAfterGeneric) {
    return maybeCompareResultAfterGeneric
  }

  if (
    queryKeys.length !== fileKeys.length ||
    fileNode.type !== queryNode.type
  ) {
    measureCompare()

    return {
      levelMatch: false,
      fileKeysToTraverseForValidatingMatch: [],
      queryKeysToTraverseForValidatingMatch: [],
      fileKeysToTraverseForOtherMatches,
    }
  }

  let primitivePropsCount = 0
  let matchingPrimitivePropsCount = 0

  queryKeys.forEach((key) => {
    const queryValue = queryNode[key]
    const fileValue = fileNode[key]

    if (
      babelParserSettings.isNode(queryValue as PoorNodeType) ||
      isNodeArray(queryValue as PoorNodeType[], babelParserSettings.isNode) ||
      isNodeArray(fileValue as PoorNodeType[], babelParserSettings.isNode)
    ) {
      keysToTraverseForValidatingMatch.push(key)
    } else {
      primitivePropsCount++

      if (
        typeof queryValue === 'string' &&
        typeof fileValue === 'string' &&
        caseInsensitive
      ) {
        if (queryValue.toLocaleLowerCase() === fileValue.toLocaleLowerCase()) {
          matchingPrimitivePropsCount++
        }
      } else if (
        queryValue === fileValue ||
        JSON.stringify(queryValue) === JSON.stringify(fileValue)
      ) {
        matchingPrimitivePropsCount++
      }
    }
  })

  const queryKeysToTraverseForValidatingMatch =
    keysToTraverseForValidatingMatch.map(queryKeysMapper)
  const fileKeysToTraverseForValidatingMatch =
    keysToTraverseForValidatingMatch.map(fileKeysMapper)

  log(
    'compare: queryKeysToTraverseForValidatingMatch',
    queryKeysToTraverseForValidatingMatch,
  )

  log(
    'compare: fileKeysToTraverseForValidatingMatch',
    fileKeysToTraverseForValidatingMatch,
  )

  log(
    'compare: fileKeysToTraverseForOtherMatches',
    fileKeysToTraverseForOtherMatches,
  )

  logStepEnd('compare')
  measureCompare()

  return {
    levelMatch:
      primitivePropsCount !== 0 &&
      primitivePropsCount === matchingPrimitivePropsCount &&
      queryKeys.every((key) => fileKeys.includes(key)),
    queryKeysToTraverseForValidatingMatch,
    fileKeysToTraverseForValidatingMatch,
    fileKeysToTraverseForOtherMatches,
  }
}
