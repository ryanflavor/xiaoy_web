# Instruction Parsing Edge Cases: Comprehensive Documentation

## Overview

This document catalogues all edge cases, boundary conditions, and error scenarios for the instruction parsing system. Understanding and properly handling these cases is critical for ensuring robust parsing in a financial trading environment where any misinterpretation could result in significant losses.

## Classification System

### Edge Case Categories

| Category | Description | Risk Level | Examples |
|----------|-------------|------------|----------|
| **Missing Components** | Instructions with optional parts omitted | Medium | Missing months, simplified targets |
| **Boundary Conditions** | Inputs at the limits of expected ranges | High | Maximum target counts, extreme exposures |
| **Ambiguous Syntax** | Instructions with multiple interpretations | Critical | Unclear target-exposure pairing |
| **Format Variations** | Valid instructions with unusual formatting | Low | Extra spaces, alternative spellings |
| **Complex Distributions** | Multi-dimensional parsing challenges | High | Multiple targets, months, and exposures |
| **Error Conditions** | Invalid or malformed instructions | Medium | Syntax errors, missing required elements |

## Detailed Edge Case Analysis

### 1. Missing Components

#### 1.1 Missing Month Specifications

**Pattern**: Instructions without explicit month references
**Default Behavior**: System defaults to `当月` (current month)

```typescript
// Test Cases
const missingMonthCases = [
  {
    input: "500 买 万1 的c",
    expected: ["沪500 当月 万1 买call"],
    category: "missing_month",
    riskLevel: "low"
  },
  {
    input: "双卖 深500 万0.5 的v", 
    expected: ["深500 当月 万0.5 双卖vega"],
    category: "missing_month",
    riskLevel: "low"
  },
  {
    input: "科创50 有买有卖 调正 万1 的d",
    expected: ["科创50 当月 万1 call"],
    category: "missing_month",
    riskLevel: "low"
  }
];
```

**Implementation Considerations**:
- Always apply default month before other processing
- Ensure consistency across all parser types
- Document default behavior clearly for users

#### 1.2 Simplified Target Names

**Pattern**: Short-form target specifications that require expansion
**Behavior**: Automatic expansion to full market names

```typescript
// Target Expansion Cases
const targetExpansionCases = [
  {
    input: "50 买 万1 的c",
    expected: ["沪50 当月 万1 买call"],
    expansion: "50 → 沪50",
    category: "target_simplification"
  },
  {
    input: "80 双卖 万1 的v",
    expected: ["科创80 当月 万1 双卖vega"],
    expansion: "80 → 科创80",
    category: "target_simplification"
  },
  {
    input: "深圳500 买 万1 的c",
    expected: ["深500 当月 万1 买call"],
    expansion: "深圳500 → 深500",
    category: "target_simplification"
  }
];
```

#### 1.3 Implied Actions

**Pattern**: Instructions where actions are contextually implied
**Risk**: High - misinterpretation could lead to wrong trade direction

```typescript
// Implied Action Cases (require careful handling)
const impliedActionCases = [
  {
    input: "创业板 下月 万1的p",  // Missing explicit buy/sell
    expected: "ERROR: No action specified",
    category: "missing_action",
    riskLevel: "high"
  },
  {
    input: "500 万1 的c",  // Missing action entirely
    expected: "ERROR: No action found",
    category: "missing_action", 
    riskLevel: "high"
  }
];
```

### 2. Boundary Conditions

#### 2.1 Maximum Target Counts

**Pattern**: Instructions with many simultaneous targets
**Challenge**: Distribution logic complexity increases exponentially

```typescript
// Maximum Target Cases
const maxTargetCases = [
  {
    input: "沪50 沪300 沪500 深100 深300 深500 科创50 科创80 创业板 IH IF IC IM 买 当月 万1 万0.5 万2 万0.3 万1.5 万0.8 万0.2 万1.2 万0.6 万1.8 万0.4 万2.5 万0.7 的c",
    complexity: "13 targets, 13 exposures",
    expected: "13 individual instructions",
    category: "max_targets",
    riskLevel: "high"
  }
];
```

#### 2.2 Extreme Exposure Values

**Pattern**: Very large or very small exposure amounts
**Challenge**: Numeric precision and validation

```typescript
// Extreme Exposure Cases
const extremeExposureCases = [
  {
    input: "500 买 万0.0001 的c",
    exposure: "万0.0001",
    category: "min_exposure",
    validation: "Should handle micro-exposures"
  },
  {
    input: "500 买 万999999 的c", 
    exposure: "万999999",
    category: "max_exposure",
    validation: "Should handle large exposures"
  },
  {
    input: "500 买 万1.23456789 的c",
    exposure: "万1.23456789",
    category: "precision_exposure",
    validation: "Should preserve decimal precision"
  }
];
```

#### 2.3 Multiple Month Combinations

**Pattern**: Instructions spanning many months
**Challenge**: Cartesian product explosion

```typescript
// Multiple Month Cases
const multipleMonthCases = [
  {
    input: "500 买 当月和下月和下季和隔季 万1 万0.5 万2 万0.8 的c",
    months: ["当月", "下月", "下季", "隔季"],
    exposures: ["万1", "万0.5", "万2", "万0.8"],
    expected: [
      "沪500 当月 万1 买call",
      "沪500 下月 万0.5 买call", 
      "沪500 下季 万2 买call",
      "沪500 隔季 万0.8 买call"
    ],
    category: "multiple_months"
  }
];
```

### 3. Ambiguous Syntax

#### 3.1 Target-Exposure Pairing Ambiguity

**Pattern**: Unclear mapping between targets and exposures
**Risk**: Critical - could result in wrong position sizes

```typescript
// Ambiguous Pairing Cases
const ambiguousPairingCases = [
  {
    input: "500 300 买 万1 万0.5 万2 的c",
    interpretation1: "500→万1, 300→万0.5, ERROR(extra exposure)",
    interpretation2: "Expand 500→[沪500,深500], 300→沪300, pair with exposures",
    correctInterpretation: "Expand targets to match exposure count",
    expected: ["沪500 当月 万1 买call", "深500 当月 万0.5 买call", "沪300 当月 万2 买call"],
    category: "ambiguous_pairing",
    riskLevel: "critical"
  },
  {
    input: "500 买 万1 万0.5 的c",
    ambiguity: "Should 500 expand to [沪500, 深500] or apply both exposures to 沪500?",
    rule: "If targets < exposures, expand targets using mapping",
    expected: ["沪500 当月 万1 买call", "深500 当月 万0.5 买call"],
    category: "target_expansion_ambiguity"
  }
];
```

#### 3.2 "各" Keyword Scope

**Pattern**: Unclear scope of "各" keyword application
**Risk**: High - affects position distribution logic

```typescript
// "各" Scope Cases
const eachScopeAmbiguity = [
  {
    input: "500 创业板 当月下月 各万1 的c",
    question: "Does '各' apply to targets or months?",
    correctInterpretation: "各 applies to month-target combinations",
    expected: [
      "沪500 当月 万1 买call",
      "沪500 下月 万1 买call", 
      "创业板 当月 万1 买call",
      "创业板 下月 万1 买call"
    ],
    category: "each_scope_ambiguity",
    riskLevel: "high"
  }
];
```

#### 3.3 Multiple Strike Price Interpretation

**Pattern**: Instructions with multiple strikes and ambiguous exposure distribution
**Risk**: Critical - affects specific option contracts

```typescript
// Multiple Strike Ambiguity
const multipleStrikeAmbiguity = [
  {
    input: "科创50 买 0.7c 0.75c 万0.3 0.5 的d",
    question: "How to pair strikes with exposures?",
    rule: "Pair in order: 0.7c→万0.3, 0.75c→万0.5",
    expected: [
      "科创50 当月 万0.3 买 call-0.7",
      "科创50 当月 万0.5 买 call-0.75"
    ],
    category: "strike_exposure_pairing",
    riskLevel: "critical"
  }
];
```

### 4. Format Variations

#### 4.1 Whitespace Handling

**Pattern**: Instructions with irregular spacing
**Risk**: Low - but should be handled gracefully

```typescript
// Whitespace Variation Cases
const whitespaceVariations = [
  {
    input: "   500    买   万1   的c   ",
    normalized: "500 买 万1 的c", 
    expected: ["沪500 当月 万1 买call"],
    category: "excessive_whitespace"
  },
  {
    input: "500买万1的c",  // No spaces
    expected: ["沪500 当月 万1 买call"],
    category: "no_whitespace"
  },
  {
    input: "500\t买\n万1\r\n的c",  // Mixed whitespace
    expected: ["沪500 当月 万1 买call"],
    category: "mixed_whitespace"
  }
];
```

#### 4.2 Alternative Spellings

**Pattern**: Valid but uncommon character usage
**Risk**: Medium - could be missed by regex patterns

```typescript
// Alternative Spelling Cases
const alternativeSpellings = [
  {
    input: "５００ 买 万１ 的ｃ",  // Full-width characters
    expected: "Should handle full-width numbers/letters",
    category: "fullwidth_characters",
    riskLevel: "medium"
  },
  {
    input: "500 购买 万1 的看涨",  // Alternative action words
    status: "Not supported - stick to standard patterns",
    category: "alternative_actions"
  }
];
```

#### 4.3 Punctuation Variations

**Pattern**: Instructions with optional punctuation
**Risk**: Low - but affects user experience

```typescript
// Punctuation Cases
const punctuationVariations = [
  {
    input: "500，买，万1，的c",  // Chinese commas
    expected: ["沪500 当月 万1 买call"],
    category: "chinese_punctuation"
  },
  {
    input: "500 买 万1 的c。",  // Ending period
    expected: ["沪500 当月 万1 买call"],
    category: "ending_punctuation"
  }
];
```

### 5. Complex Distribution Logic

#### 5.1 Multi-Dimensional Distribution

**Pattern**: Complex combinations of targets, months, and exposures
**Challenge**: Ensuring correct cartesian product logic

```typescript
// Complex Distribution Cases
const complexDistributionCases = [
  {
    input: "科创50 80 当月下月 有买有卖 调正 万1 万0.5 万0.8 万0.3 的d",
    dimensions: {
      targets: ["科创50", "科创80"], 
      months: ["当月", "下月"],
      exposures: ["万1", "万0.5", "万0.8", "万0.3"]
    },
    distributionLogic: "targets(2) × months(2) = 4 combinations, exposures(4) = 1:1 mapping",
    expected: [
      "科创50 当月 万1 call",
      "科创80 当月 万0.5 call",
      "科创50 下月 万0.8 call", 
      "科创80 下月 万0.3 call"
    ],
    category: "complex_distribution",
    riskLevel: "high"
  }
];
```

#### 5.2 Uneven Array Length Handling

**Pattern**: Mismatched counts between components
**Challenge**: Deciding how to handle the mismatch

```typescript
// Uneven Array Cases
const unevenArrayCases = [
  {
    input: "500 买 当月下月下季 万1 万0.5 的c",
    arrays: {
      targets: 1,
      months: 3, 
      exposures: 2
    },
    challenge: "More months than exposures",
    rule: "Pair months with exposures, ignore extra months",
    expected: [
      "沪500 当月 万1 买call",
      "沪500 下月 万0.5 买call"
    ],
    category: "uneven_arrays",
    riskLevel: "medium"
  },
  {
    input: "500 买 当月 万1 万0.5 万0.8 的c", 
    arrays: {
      targets: 1,
      months: 1,
      exposures: 3
    },
    challenge: "More exposures than targets×months",
    rule: "Expand targets if possible, otherwise error",
    expected: "ERROR: Cannot distribute 3 exposures to 1 target×month",
    category: "excess_exposures",
    riskLevel: "high"
  }
];
```

### 6. Error Conditions

#### 6.1 Malformed Syntax

**Pattern**: Instructions that don't match any valid pattern
**Handling**: Clear error messages for user correction

```typescript
// Malformed Syntax Cases
const malformedSyntaxCases = [
  {
    input: "500 xyz 万1 的c",
    error: "Invalid action 'xyz'",
    validActions: ["买", "买入", "卖", "卖出"],
    category: "invalid_action"
  },
  {
    input: "买 万1 的c",
    error: "No target specified", 
    requirement: "At least one valid target required",
    category: "missing_target"
  },
  {
    input: "500 买 的c",
    error: "No exposure specified",
    requirement: "At least one exposure amount required", 
    category: "missing_exposure"
  },
  {
    input: "500 买 万1",
    error: "No option type indicator",
    requirement: "Must end with 的c, 的p, 的v, or 的d",
    category: "missing_option_type"
  }
];
```

#### 6.2 Invalid Components

**Pattern**: Syntactically correct but semantically invalid
**Handling**: Validation with helpful suggestions

```typescript
// Invalid Component Cases
const invalidComponentCases = [
  {
    input: "999 买 万1 的c",  // Unknown target
    error: "Unknown target '999'",
    suggestion: "Valid targets: 50, 300, 500, 沪50, 沪300, 沪500, etc.",
    category: "unknown_target"
  },
  {
    input: "500 买 万0 的c",  // Zero exposure
    error: "Exposure amount cannot be zero",
    category: "zero_exposure"
  },
  {
    input: "500 买 万-1 的c",  // Negative exposure
    error: "Exposure amount cannot be negative",
    category: "negative_exposure"
  }
];
```

#### 6.3 Conflicting Instructions

**Pattern**: Instructions with internal contradictions
**Risk**: High - could indicate user confusion

```typescript
// Conflicting Instruction Cases
const conflictingInstructionCases = [
  {
    input: "500 双买 双卖 万1 的v",
    conflict: "Both 双买 and 双卖 specified",
    resolution: "Take first action found",
    category: "conflicting_actions"
  },
  {
    input: "500 有买有卖 调正 调负 万1 的d",
    conflict: "Both 调正 (call) and 调负 (put) specified",
    resolution: "Take first direction found",
    category: "conflicting_directions"
  }
];
```

## Edge Case Handling Strategies

### 1. Defensive Programming

```typescript
// Defensive parsing approach
export class DefensiveParser {
  parseWithValidation(instruction: string): ParsingResult {
    try {
      // 1. Input sanitization
      const sanitized = this.sanitizeInput(instruction);
      
      // 2. Early validation
      this.validateBasicStructure(sanitized);
      
      // 3. Component extraction with fallbacks
      const components = this.extractComponentsWithFallbacks(sanitized);
      
      // 4. Cross-validation
      this.crossValidateComponents(components);
      
      // 5. Parse with error context
      return this.parseWithContext(components);
      
    } catch (error) {
      return this.createDetailedError(error, instruction);
    }
  }

  private sanitizeInput(instruction: string): string {
    return instruction
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/，/g, ' ')    // Replace Chinese commas
      .replace(/。$/, '');    // Remove ending period
  }

  private validateBasicStructure(instruction: string): void {
    if (instruction.length === 0) {
      throw new Error('Instruction cannot be empty');
    }
    
    if (instruction.length > 500) {
      throw new Error('Instruction too long (max 500 characters)');
    }
    
    // Check for required indicators
    const hasOptionIndicator = /的[cpvd]/.test(instruction);
    if (!hasOptionIndicator) {
      throw new Error('Instruction must contain option type indicator (的c, 的p, 的v, or 的d)');
    }
  }
}
```

### 2. Error Context Enhancement

```typescript
// Enhanced error reporting
export class ErrorContextEnhancer {
  createContextualError(
    error: Error, 
    instruction: string, 
    parsingStage: string
  ): DetailedParsingError {
    const context = this.analyzeInstruction(instruction);
    
    return {
      message: error.message,
      instruction,
      parsingStage,
      context,
      suggestions: this.generateSuggestions(instruction, error),
      similarInstructions: this.findSimilarInstructions(instruction)
    };
  }

  private analyzeInstruction(instruction: string): InstructionContext {
    return {
      hasTargets: this.hasTargets(instruction),
      hasActions: this.hasActions(instruction), 
      hasExposures: this.hasExposures(instruction),
      hasMonths: this.hasMonths(instruction),
      hasOptionType: this.hasOptionType(instruction),
      detectedType: this.detectInstructionType(instruction)
    };
  }

  private generateSuggestions(instruction: string, error: Error): string[] {
    const suggestions: string[] = [];
    
    if (error.message.includes('No targets found')) {
      suggestions.push('Add a target like: 500, 沪50, 创业板');
    }
    
    if (error.message.includes('No action found')) {
      suggestions.push('Add an action like: 买, 卖, 双买, 双卖');
    }
    
    // More contextual suggestions...
    
    return suggestions;
  }
}
```

### 3. Graceful Degradation

```typescript
// Graceful handling of edge cases
export class GracefulParser {
  parseWithGracefulDegradation(instruction: string): ParsingResult {
    try {
      return this.normalParse(instruction);
    } catch (error) {
      // Try fallback strategies
      return this.attemptFallbackParsing(instruction, error);
    }
  }

  private attemptFallbackParsing(
    instruction: string, 
    originalError: Error
  ): ParsingResult {
    const fallbackStrategies = [
      () => this.parseWithDefaultMonth(instruction),
      () => this.parseWithSimplifiedTargets(instruction),
      () => this.parseWithAssumedAction(instruction),
      () => this.parsePartialInstruction(instruction)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = strategy();
        result.warnings = [`Used fallback parsing due to: ${originalError.message}`];
        return result;
      } catch {
        // Continue to next strategy
      }
    }

    // All fallbacks failed
    throw originalError;
  }
}
```

## Testing Edge Cases

### Test Case Generation

```typescript
// Automated edge case generation
export class EdgeCaseGenerator {
  generateEdgeCases(): TestCase[] {
    const edgeCases: TestCase[] = [];
    
    // Generate boundary conditions
    edgeCases.push(...this.generateBoundaryCases());
    
    // Generate format variations
    edgeCases.push(...this.generateFormatVariations());
    
    // Generate error scenarios
    edgeCases.push(...this.generateErrorScenarios());
    
    // Generate complex distributions
    edgeCases.push(...this.generateComplexDistributions());
    
    return edgeCases;
  }

  private generateBoundaryCases(): TestCase[] {
    const cases: TestCase[] = [];
    
    // Maximum target combinations
    const allTargets = ['沪50', '沪300', '沪500', '深100', '深300', '深500', 
                       '科创50', '科创80', '创业板', 'IH', 'IF', 'IC', 'IM'];
    
    // Generate test with all targets
    cases.push({
      input: `${allTargets.join(' ')} 买 当月 ${allTargets.map((_, i) => `万${i + 1}`).join(' ')} 的c`,
      category: 'max_targets',
      expectedCount: allTargets.length
    });
    
    return cases;
  }
}
```

### Comprehensive Edge Case Test Suite

```typescript
// Complete edge case test coverage
describe('Edge Case Handling', () => {
  const edgeCaseCategories = [
    'missing_components',
    'boundary_conditions', 
    'ambiguous_syntax',
    'format_variations',
    'complex_distributions',
    'error_conditions'
  ];

  edgeCaseCategories.forEach(category => {
    describe(`${category} edge cases`, () => {
      const testCases = EdgeCaseRegistry.getTestCases(category);
      
      testCases.forEach(testCase => {
        test(`should handle ${testCase.description}`, () => {
          if (testCase.shouldSucceed) {
            const result = parseInstruction(testCase.input);
            expect(result.success).toBe(true);
            expect(result.instructions).toEqual(testCase.expected);
          } else {
            expect(() => parseInstruction(testCase.input)).toThrow(testCase.expectedError);
          }
        });
      });
    });
  });
});
```

## Production Monitoring

### Edge Case Detection

```typescript
// Monitor edge cases in production
export class EdgeCaseMonitor {
  detectEdgeCase(instruction: string, result: ParsingResult): EdgeCaseMetric {
    const metrics: EdgeCaseMetric = {
      instruction,
      timestamp: Date.now(),
      category: this.categorizeInstruction(instruction),
      complexity: this.calculateComplexity(instruction),
      hadWarnings: result.warnings?.length > 0,
      executionTime: result.executionTimeMs,
      riskLevel: this.assessRiskLevel(instruction, result)
    };

    // Alert on high-risk edge cases
    if (metrics.riskLevel === 'high' || metrics.riskLevel === 'critical') {
      this.alertOnHighRiskEdgeCase(metrics);
    }

    return metrics;
  }

  private calculateComplexity(instruction: string): number {
    let complexity = 0;
    
    // Count components
    complexity += (instruction.match(/[沪深科创]\w+|创业板|I[HFC]M?/g) || []).length; // targets
    complexity += (instruction.match(/当月|下月|下季|隔季/g) || []).length; // months  
    complexity += (instruction.match(/[千万][\d\.\s]+/g) || []).length; // exposures
    complexity += instruction.includes('各') ? 2 : 0; // "各" multiplier
    
    return complexity;
  }

  private assessRiskLevel(instruction: string, result: ParsingResult): RiskLevel {
    if (!result.success) return 'high';
    if (result.warnings?.length > 0) return 'medium';
    if (this.calculateComplexity(instruction) > 10) return 'medium';
    return 'low';
  }
}
```

This comprehensive edge case documentation ensures robust handling of all parsing scenarios, critical for the reliability of a financial trading system.