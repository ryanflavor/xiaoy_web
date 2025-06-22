import { BaseMockWorker } from './base-mock-worker';
import { Logger } from 'pino';
import { InstructionType } from '@xiaoy/zmq-protocol';

export class MockInstructionWorker extends BaseMockWorker {
  constructor(brokerUrl: string, logger: Logger) {
    super('instruction_service', brokerUrl, logger);
  }

  protected async handleServiceCall(
    method: string,
    args: any[],
    kwargs: Record<string, any>
  ): Promise<any> {
    switch (method) {
      case 'parse_instructions':
        return this.parseInstructions(args[0], kwargs);
      
      case 'execute_instructions':
        return this.executeInstructions(kwargs);
      
      case 'get_execution_status':
        return this.getExecutionStatus(args[0]);
      
      case 'cancel_execution':
        return this.cancelExecution(args[0]);
      
      case 'get_instruction_history':
        return this.getInstructionHistory(kwargs);
      
      case 'ping':
        return 'pong';
      
      case 'get_health':
        return { healthy: true, message: 'Mock instruction service is healthy' };
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private parseInstructions(text: string, kwargs: any) {
    // Mock instruction parsing logic
    const instructions = [];
    
    // Parse Vega instructions
    const vegaMatch = text.match(/双(买|卖)\s*(\S+)\s*(当月|次月|季月)\s*(\S+)\s*的v/);
    if (vegaMatch) {
      const [_, direction, target, month, exposure] = vegaMatch;
      instructions.push({
        type: InstructionType.VEGA,
        raw: text,
        parsed: `${this.expandTarget(target)} ${month} ${exposure} 双${direction}vega`,
        target: this.expandTarget(target),
        month,
        exposure,
        direction: direction === '买' ? 'buy' : 'sell',
        contracts: this.generateMockContracts('vega', target, month),
      });
    }
    
    // Parse Delta instructions
    const deltaMatch = text.match(/(买|卖)\s*(\S+)\s*(当月|次月|季月)?\s*(\S+)\s*的(c|p)/);
    if (deltaMatch) {
      const [_, direction, target, month = '当月', exposure, optionType] = deltaMatch;
      instructions.push({
        type: InstructionType.DELTA_SINGLE,
        raw: text,
        parsed: `${this.expandTarget(target)} ${month} ${exposure} ${direction}${optionType === 'c' ? 'call' : 'put'}`,
        target: this.expandTarget(target),
        month,
        exposure,
        direction: direction === '买' ? 'buy' : 'sell',
        optionType: optionType === 'c' ? 'call' : 'put',
        contracts: this.generateMockContracts('delta', target, month),
      });
    }
    
    // Parse Clear instructions
    const clearMatch = text.match(/(\S+)\s*([\d.]+)(c|p)\s*(平|清)\s*(\d+)%?/);
    if (clearMatch) {
      const [_, target, strike, optionType, action, percentage] = clearMatch;
      instructions.push({
        type: InstructionType.CLEAR,
        raw: text,
        parsed: `${this.expandTarget(target)} 当月 ${optionType === 'c' ? 'call' : 'put'}-${strike} ${action}${percentage}%`,
        target: this.expandTarget(target),
        strike: parseFloat(strike),
        optionType: optionType === 'c' ? 'call' : 'put',
        percentage: parseInt(percentage),
        contracts: [`${this.expandTarget(target)}-${strike}-${optionType}`],
      });
    }
    
    return {
      success: instructions.length > 0,
      instructions,
      errors: instructions.length === 0 ? ['无法解析指令'] : undefined,
    };
  }

  private executeInstructions(kwargs: any) {
    const { instructions, accounts, dry_run } = kwargs;
    const executionId = `exec_${Date.now()}`;
    
    const results = instructions.map((inst: any) => ({
      instruction: inst,
      status: dry_run ? 'pending' : 'success',
      message: dry_run ? 'Dry run - no execution' : 'Executed successfully',
    }));
    
    return {
      success: true,
      execution_id: executionId,
      results,
    };
  }

  private getExecutionStatus(executionId: string) {
    return {
      execution_id: executionId,
      status: 'completed',
      progress: 100,
      start_time: Date.now() - 5000,
      end_time: Date.now(),
      results: [
        {
          account: 'account1',
          status: 'success',
          orders: 10,
          filled: 10,
        },
      ],
    };
  }

  private cancelExecution(executionId: string) {
    return {
      success: true,
      message: `Execution ${executionId} cancelled`,
    };
  }

  private getInstructionHistory(kwargs: any) {
    const { accounts, limit = 10, offset = 0 } = kwargs;
    
    const history = [];
    for (let i = 0; i < limit; i++) {
      history.push({
        id: `hist_${offset + i}`,
        timestamp: Date.now() - (i * 3600000),
        text: `双卖 500 当月 万1 的v`,
        parsed: '沪500 当月 万1 双卖vega',
        accounts: accounts || ['account1'],
        status: 'completed',
        execution_id: `exec_${offset + i}`,
      });
    }
    
    return history;
  }

  private expandTarget(target: string): string {
    const targetMap: Record<string, string> = {
      '50': '沪50',
      '300': '沪300',
      '500': '沪500',
      '1000': '中1000',
      '80': '科创80',
    };
    
    return targetMap[target] || target;
  }

  private generateMockContracts(type: string, target: string, month: string): string[] {
    const contracts = [];
    const basePrice = type === 'vega' ? 5.0 : 4.5;
    
    for (let i = 0; i < 5; i++) {
      const strike = (basePrice + i * 0.1).toFixed(1);
      contracts.push(`${this.expandTarget(target)}-${strike}-${type === 'vega' ? 'call' : 'put'}`);
    }
    
    return contracts;
  }
}