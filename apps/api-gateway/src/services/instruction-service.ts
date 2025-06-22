import { BaseService } from './base-service';
import { 
  ParsedInstruction, 
  InstructionType,
  VegaInstruction,
  DeltaInstruction,
  ClearInstruction 
} from '@xiaoy/zmq-protocol';

export interface ParseInstructionRequest {
  text: string;
  accounts: string[];
  timestamp?: number;
}

export interface ParseInstructionResponse {
  success: boolean;
  instructions: ParsedInstruction[];
  errors?: string[];
}

export interface ExecuteInstructionRequest {
  instructions: ParsedInstruction[];
  accounts: string[];
  dryRun?: boolean;
}

export interface ExecuteInstructionResponse {
  success: boolean;
  executionId: string;
  results?: Array<{
    instruction: ParsedInstruction;
    status: 'success' | 'failed' | 'pending';
    message?: string;
  }>;
  errors?: string[];
}

export class InstructionService extends BaseService {
  constructor(zmqClient: any, logger: any) {
    super('instruction_service', zmqClient, logger);
  }

  /**
   * Parse natural language trading instructions
   */
  async parseInstructions(request: ParseInstructionRequest): Promise<ParseInstructionResponse> {
    try {
      const result = await this.call('parse_instructions', [request.text], {
        accounts: request.accounts,
        timestamp: request.timestamp || Date.now(),
      });

      // Validate and transform the response
      if (result && typeof result === 'object') {
        return {
          success: result.success ?? true,
          instructions: this.validateInstructions(result.instructions || []),
          errors: result.errors,
        };
      }

      // Handle legacy format (array of instructions)
      if (Array.isArray(result)) {
        return {
          success: true,
          instructions: this.validateInstructions(result),
        };
      }

      throw new Error('Invalid response format from instruction service');
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to parse instructions');
      
      return {
        success: false,
        instructions: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Execute parsed instructions
   */
  async executeInstructions(request: ExecuteInstructionRequest): Promise<ExecuteInstructionResponse> {
    try {
      const result = await this.call('execute_instructions', [], {
        instructions: request.instructions,
        accounts: request.accounts,
        dry_run: request.dryRun ?? false,
      });

      return {
        success: result.success ?? true,
        executionId: result.execution_id || result.executionId,
        results: result.results,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to execute instructions');
      
      return {
        success: false,
        executionId: '',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    return this.call('get_execution_status', [executionId]);
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const result = await this.call('cancel_execution', [executionId]);
      return result.success ?? false;
    } catch (error) {
      this.logger.error({ error, executionId }, 'Failed to cancel execution');
      return false;
    }
  }

  /**
   * Get instruction history
   */
  async getInstructionHistory(
    accounts: string[],
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await this.call('get_instruction_history', [], {
        accounts,
        limit,
        offset,
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get instruction history');
      return [];
    }
  }

  /**
   * Validate instruction types
   */
  private validateInstructions(instructions: any[]): ParsedInstruction[] {
    return instructions.map(inst => {
      // Ensure instruction has required fields
      if (!inst.type || !inst.raw) {
        throw new Error('Invalid instruction format');
      }

      // Validate specific instruction types
      switch (inst.type) {
        case InstructionType.VEGA:
          return this.validateVegaInstruction(inst);
        case InstructionType.DELTA_SINGLE:
        case InstructionType.DELTA_DUAL:
          return this.validateDeltaInstruction(inst);
        case InstructionType.CLEAR:
          return this.validateClearInstruction(inst);
        default:
          throw new Error(`Unknown instruction type: ${inst.type}`);
      }
    });
  }

  private validateVegaInstruction(inst: any): VegaInstruction {
    return {
      type: InstructionType.VEGA,
      raw: inst.raw,
      parsed: inst.parsed,
      target: inst.target,
      month: inst.month,
      exposure: inst.exposure,
      direction: inst.direction,
      contracts: inst.contracts || [],
    };
  }

  private validateDeltaInstruction(inst: any): DeltaInstruction {
    return {
      type: inst.type,
      raw: inst.raw,
      parsed: inst.parsed,
      target: inst.target,
      month: inst.month,
      exposure: inst.exposure,
      optionType: inst.optionType || inst.option_type,
      direction: inst.direction,
      contracts: inst.contracts || [],
    };
  }

  private validateClearInstruction(inst: any): ClearInstruction {
    return {
      type: InstructionType.CLEAR,
      raw: inst.raw,
      parsed: inst.parsed,
      target: inst.target,
      strike: inst.strike,
      optionType: inst.optionType || inst.option_type,
      percentage: inst.percentage,
      contracts: inst.contracts || [],
    };
  }
}