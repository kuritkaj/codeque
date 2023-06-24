import { NodesComparator } from '../../types'
import { wildcardForAnyImport } from './nodeComparators/wildcardForAnyImport'
import { matchJsxElementRegardlessClosingTagNodesComparator } from './nodeComparators/matchJsxElementRegardlessClosingTag'
import { matchJsxIdentifierUsingIdentifierNodesComparator } from './nodeComparators/matchJsxIdentifierUsingIdentifier'
import { partialMatchTemplateLiteralNodesComparator } from './nodeComparators/partialMatchTemplateLiteral'
import { matchOptionalFlagInMemberExpressionNodesComparator } from './nodeComparators/matchOptionalFlagInMemberExpression'
import { matchDestructPropBeforeRenameNodesComparator } from './nodeComparators/matchDestructPropBeforeRename'
import { wildcardForAnyTypeAnnotation } from './nodeComparators/wildcardForAnyTypeAnnotation'
import { wildcardForAnyTypeParameter } from './nodeComparators/wildcardForAnyTypeParameter'
import { matchObjectPropertiesOfDifferentTypesNodesComparator } from './nodeComparators/matchObjectPropertiesOfDifferentTypes'

// Better keep this order
export const afterWildcardsComparators: NodesComparator[] = [
  wildcardForAnyImport,
  wildcardForAnyTypeAnnotation,
  wildcardForAnyTypeParameter,
  matchDestructPropBeforeRenameNodesComparator,
  matchObjectPropertiesOfDifferentTypesNodesComparator,
  matchJsxElementRegardlessClosingTagNodesComparator,
  matchJsxIdentifierUsingIdentifierNodesComparator,
  partialMatchTemplateLiteralNodesComparator,
  matchOptionalFlagInMemberExpressionNodesComparator,
]
