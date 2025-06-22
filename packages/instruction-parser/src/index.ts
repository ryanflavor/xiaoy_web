// Core instruction parsing logic for trading commands
// Implementation will match Python reference implementations exactly

import { InstructionType, ParsedInstruction, InstructionContract } from '@xiaoy/shared-types';

// ============================================================================
// Parser Interface Definitions
// ============================================================================

export interface InstructionParser {
  parse(instruction: string): ParsedInstruction;
  validate(instruction: string): boolean;
  getType(instruction: string): InstructionType | null;
}

export interface ParsingResult {
  success: boolean;
  instruction?: ParsedInstruction;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Parser Configuration
// ============================================================================

export interface ParserConfig {
  enableLogging: boolean;
  strictMode: boolean;
  defaultMonth: string;
  supportedTargets: string[];
  riskLimits: {
    maxContracts: number;
    maxExposure: number;
  };
}

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  enableLogging: false,
  strictMode: true,
  defaultMonth: '当月',
  supportedTargets: ['沪50', '深500', '沪500', '科创80'],
  riskLimits: {
    maxContracts: 100,
    maxExposure: 1000000,
  },
};

// ============================================================================
// Base Parser Class (Stub Implementation)
// ============================================================================

export abstract class BaseInstructionParser implements InstructionParser {
  protected config: ParserConfig;

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
  }

  abstract parse(instruction: string): ParsedInstruction;
  abstract validate(instruction: string): boolean;
  abstract getType(instruction: string): InstructionType | null;

  protected generateId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createBaseInstruction(
    originalText: string,
    type: InstructionType
  ): Omit<ParsedInstruction, 'contracts' | 'crossAccountRisk'> {
    return {
      id: this.generateId(),
      originalText: originalText.trim(),
      type,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Vega Instruction Parser (Stub)
// ============================================================================

export class VegaInstructionParser extends BaseInstructionParser {
  getType(instruction: string): InstructionType | null {
    // Pattern: "双买/双卖 [标的] [月份] [敞口] 的v"
    const vegaPattern = /^(双买|双卖)\s+\d+\s+\S+\s+\S+\s*的v$/;
    return vegaPattern.test(instruction.trim()) ? 'vega' : null;
  }

  validate(instruction: string): boolean {
    return this.getType(instruction) === 'vega';
  }

  parse(instruction: string): ParsedInstruction {
    // TODO: Implement exact Python reference logic from docs/appendices/instructions/vega_case1.py
    const baseInstruction = this.createBaseInstruction(instruction, 'vega');
    
    return {
      ...baseInstruction,
      contracts: [], // TODO: Parse contracts from instruction
      crossAccountRisk: 0, // TODO: Calculate cross-account risk
    };
  }
}

// ============================================================================
// Single-Side Delta Parser (Stub)
// ============================================================================

export class SingleDeltaInstructionParser extends BaseInstructionParser {
  getType(instruction: string): InstructionType | null {
    // Pattern: "买/卖 [标的] [月份] [敞口] 的c/p"
    const deltaPattern = /^(买|卖)\s+\d+\s+\S+\s+\S+\s*的(c|p)$/;
    return deltaPattern.test(instruction.trim()) ? 'single-delta' : null;
  }

  validate(instruction: string): boolean {
    return this.getType(instruction) === 'single-delta';
  }

  parse(instruction: string): ParsedInstruction {
    // TODO: Implement exact Python reference logic from docs/appendices/instructions/delta_case1.py
    const baseInstruction = this.createBaseInstruction(instruction, 'single-delta');
    
    return {
      ...baseInstruction,
      contracts: [], // TODO: Parse contracts from instruction
      crossAccountRisk: 0, // TODO: Calculate cross-account risk
    };
  }
}

// ============================================================================
// Dual-Side Delta Parser (Stub)
// ============================================================================

export class DualDeltaInstructionParser extends BaseInstructionParser {
  getType(instruction: string): InstructionType | null {
    // Pattern: "[标的] 有买有卖 调正/调负 [敞口] 的d"
    const dualDeltaPattern = /^\d+\s+有买有卖\s+(调正|调负)\S+\s*的d$/;
    return dualDeltaPattern.test(instruction.trim()) ? 'dual-delta' : null;
  }

  validate(instruction: string): boolean {
    return this.getType(instruction) === 'dual-delta';
  }

  parse(instruction: string): ParsedInstruction {
    // TODO: Implement exact Python reference logic from docs/appendices/instructions/delta_case2.py
    const baseInstruction = this.createBaseInstruction(instruction, 'dual-delta');
    
    return {
      ...baseInstruction,
      contracts: [], // TODO: Parse contracts from instruction
      crossAccountRisk: 0, // TODO: Calculate cross-account risk
    };
  }
}

// ============================================================================
// Clear/Close Position Parser (Stub)
// ============================================================================

export class ClearInstructionParser extends BaseInstructionParser {
  getType(instruction: string): InstructionType | null {
    // Pattern: "[标的] [行权价]c/p 平/清 [比例]%"
    const clearPattern = /^\d+\s+\d+\.?\d*(c|p)\s+(平|清)\s*\d+%$/;
    return clearPattern.test(instruction.trim()) ? 'clear' : null;
  }

  validate(instruction: string): boolean {
    return this.getType(instruction) === 'clear';
  }

  parse(instruction: string): ParsedInstruction {
    // TODO: Implement exact Python reference logic from docs/appendices/instructions/clear_case1.py
    const baseInstruction = this.createBaseInstruction(instruction, 'clear');
    
    return {
      ...baseInstruction,
      contracts: [], // TODO: Parse contracts from instruction
      crossAccountRisk: 0, // TODO: Calculate cross-account risk
    };
  }
}

// ============================================================================
// Main Parser Factory
// ============================================================================

export class InstructionParserFactory {
  private parsers: Map<InstructionType, BaseInstructionParser> = new Map();

  constructor(config: Partial<ParserConfig> = {}) {
    this.parsers.set('vega', new VegaInstructionParser(config));
    this.parsers.set('single-delta', new SingleDeltaInstructionParser(config));
    this.parsers.set('dual-delta', new DualDeltaInstructionParser(config));
    this.parsers.set('clear', new ClearInstructionParser(config));
  }

  parseInstruction(instruction: string): ParsingResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!instruction || instruction.trim().length === 0) {
      errors.push('Instruction cannot be empty');
      return { success: false, errors, warnings };
    }

    // Try each parser to determine instruction type
    for (const [type, parser] of this.parsers) {
      if (parser.getType(instruction) === type) {
        try {
          const parsedInstruction = parser.parse(instruction);
          return {
            success: true,
            instruction: parsedInstruction,
            errors,
            warnings,
          };
        } catch (error) {
          errors.push(`Parsing failed for type ${type}: ${error}`);
        }
      }
    }

    errors.push('No matching parser found for instruction');
    return { success: false, errors, warnings };
  }

  validateInstruction(instruction: string): boolean {
    return this.parseInstruction(instruction).success;
  }

  getInstructionType(instruction: string): InstructionType | null {
    for (const [type, parser] of this.parsers) {
      if (parser.getType(instruction) === type) {
        return type;
      }
    }
    return null;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const createInstructionParser = (config?: Partial<ParserConfig>) => {
  return new InstructionParserFactory(config);
};