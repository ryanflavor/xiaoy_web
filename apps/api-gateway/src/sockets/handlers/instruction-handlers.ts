import { Socket } from 'socket.io';
import { Logger } from 'pino';
import { InstructionService } from '../../services/instruction-service';

export function registerInstructionHandlers(
  socket: Socket,
  instructionService: InstructionService,
  logger: Logger
) {
  // Real-time instruction parsing
  socket.on('instruction:parse', async (data: { 
    text: string; 
    accounts: string[];
  }) => {
    try {
      const { text, accounts } = data;
      
      if (!text || !Array.isArray(accounts) || accounts.length === 0) {
        socket.emit('instruction:parse:error', {
          message: 'Invalid input',
        });
        return;
      }

      // Parse instruction
      const result = await instructionService.parseInstructions({
        text,
        accounts,
        timestamp: Date.now(),
      });

      socket.emit('instruction:parse:response', result);
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to parse instruction');
      socket.emit('instruction:parse:error', {
        message: 'Failed to parse instruction',
      });
    }
  });

  // Execute instruction with real-time updates
  socket.on('instruction:execute', async (data: {
    instructions: any[];
    accounts: string[];
    dryRun?: boolean;
  }) => {
    try {
      const { instructions, accounts, dryRun } = data;
      
      if (!Array.isArray(instructions) || !Array.isArray(accounts)) {
        socket.emit('instruction:execute:error', {
          message: 'Invalid input',
        });
        return;
      }

      // Execute instructions
      const result = await instructionService.executeInstructions({
        instructions,
        accounts,
        dryRun,
      });

      socket.emit('instruction:execute:response', result);

      // If execution started successfully, join execution room for updates
      if (result.success && result.executionId) {
        socket.join(`execution:${result.executionId}`);
      }
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to execute instructions');
      socket.emit('instruction:execute:error', {
        message: 'Failed to execute instructions',
      });
    }
  });

  // Subscribe to execution updates
  socket.on('instruction:execution:subscribe', async (data: { 
    executionId: string;
  }) => {
    try {
      const { executionId } = data;
      
      // Join execution room
      socket.join(`execution:${executionId}`);
      
      // Get current status
      const status = await instructionService.getExecutionStatus(executionId);
      
      socket.emit('instruction:execution:status', {
        executionId,
        status,
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to subscribe to execution');
      socket.emit('instruction:execution:error', {
        message: 'Failed to subscribe to execution',
      });
    }
  });

  // Cancel execution
  socket.on('instruction:execution:cancel', async (data: { 
    executionId: string;
  }) => {
    try {
      const { executionId } = data;
      
      const success = await instructionService.cancelExecution(executionId);
      
      socket.emit('instruction:execution:cancel:response', {
        executionId,
        success,
      });

      if (success) {
        // Notify all clients watching this execution
        socket.to(`execution:${executionId}`).emit('instruction:execution:cancelled', {
          executionId,
          cancelledBy: socket.data.userId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to cancel execution');
      socket.emit('instruction:execution:error', {
        message: 'Failed to cancel execution',
      });
    }
  });

  // Get recent instruction history
  socket.on('instruction:history:recent', async (data: { 
    accounts: string[];
    limit?: number;
  }) => {
    try {
      const { accounts, limit = 10 } = data;
      
      const history = await instructionService.getInstructionHistory(accounts, limit, 0);
      
      socket.emit('instruction:history:response', {
        history,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to get instruction history');
      socket.emit('instruction:history:error', {
        message: 'Failed to get instruction history',
      });
    }
  });
}