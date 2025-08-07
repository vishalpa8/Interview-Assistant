// electron/ollama-service.ts
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// Define types for Ollama API
interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

// HTTP-based Ollama client to avoid module dependency issues
class HttpOllamaClient {
  private baseUrl: string;

  constructor(host: string = 'http://localhost:11434') {
    this.baseUrl = host;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };



      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          console.log('[HTTP] Response received, length:', responseData.length);
          try {
            const parsed = JSON.parse(responseData);
            console.log('[HTTP] Parsed response:', JSON.stringify(parsed).substring(0, 200) + '...');
            resolve(parsed);
          } catch (error) {
            console.error('[HTTP] Failed to parse response:', responseData.substring(0, 200));
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async list(): Promise<OllamaListResponse> {
    return this.makeRequest('/api/tags');
  }

  async generate(params: OllamaGenerateRequest, streamingCallback?: (partialText: string) => void): Promise<OllamaGenerateResponse> {
    return this.makeStreamingRequest('/api/generate', params, streamingCallback);
  }

  private async makeStreamingRequest(endpoint: string, data: any, streamingCallback?: (partialText: string) => void): Promise<OllamaGenerateResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minute timeout for complex requests
      };

      // Set up a timeout for the entire request
      const requestTimeout = setTimeout(() => {
        reject(new Error('Request timeout - Ollama took too long to respond'));
      }, 300000);

      const req = http.request(options, (res) => {
        let responseData = '';
        let fullResponse = '';
        let lastChunkTime = Date.now();
        let isComplete = false;
        
        // Set up a timeout to detect when streaming has stopped
        let streamTimeout: NodeJS.Timeout | null = null;
        
        const resetStreamTimeout = () => {
          if (streamTimeout) {
            clearTimeout(streamTimeout);
          }
          streamTimeout = setTimeout(() => {
            if (!isComplete && fullResponse) {
              // Check if response seems complete (for short 3-4 line responses)
              const trimmedResponse = fullResponse.trim();
              const lineCount = trimmedResponse.split('\n').length;
              const hasNaturalEnding = /[.!?]$|```$/.test(trimmedResponse);
              const hasCodeBlock = /```[\s\S]*```/.test(trimmedResponse);
              const seemsComplete = (lineCount >= 3 && hasNaturalEnding) || 
                                   (hasCodeBlock && lineCount >= 2) ||
                                   trimmedResponse.length > 200; // Fallback for longer responses
              
              if (seemsComplete) {
                isComplete = true;
                clearTimeout(requestTimeout);
                resolve({
                  response: fullResponse,
                  done: true
                });
              }
            }
          }, 2000); // 2 second timeout for short responses
        };
        
        res.on('data', (chunk) => {
          if (isComplete) return;
          
          responseData += chunk;
          lastChunkTime = Date.now();
          resetStreamTimeout();
          
          // Process each line as a separate JSON object
          const lines = responseData.split('\n');
          responseData = lines.pop() || ''; // Keep the incomplete line for next chunk
          
          for (const line of lines) {
            if (line.trim() && !isComplete) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  fullResponse += parsed.response;
                  
                  // Send partial response to callback for real-time UI updates
                  if (streamingCallback) {
                    streamingCallback(fullResponse);
                  }
                }
                
                // If this is the final chunk, resolve with the complete response
                if (parsed.done) {
                  isComplete = true;
                  if (streamTimeout) clearTimeout(streamTimeout);
                  clearTimeout(requestTimeout);
                  resolve({
                    response: fullResponse,
                    done: true
                  });
                  return;
                }
              } catch (error) {
                // Silent error handling for malformed chunks
                console.warn('[OLLAMA] Failed to parse chunk:', line.substring(0, 100));
              }
            }
          }
        });
        
        res.on('end', () => {
          if (isComplete) return;
          
          // Handle any remaining data
          if (responseData.trim()) {
            try {
              const parsed = JSON.parse(responseData);
              if (parsed.response) {
                fullResponse += parsed.response;
                if (streamingCallback) {
                  streamingCallback(fullResponse);
                }
              }
              if (parsed.done) {
                isComplete = true;
              }
            } catch (error) {
              // Silent error handling for final chunk
            }
          }
          
          // Clean up timeouts
          if (streamTimeout) clearTimeout(streamTimeout);
          clearTimeout(requestTimeout);
          
          // If we reach here, resolve with what we have
          if (fullResponse) {
            resolve({
              response: fullResponse,
              done: true
            });
          } else {
            reject(new Error('No response received from streaming request'));
          }
        });
        
        res.on('error', (error) => {
          if (streamTimeout) clearTimeout(streamTimeout);
          clearTimeout(requestTimeout);
          reject(error);
        });
      });

      req.on('error', (error) => {
        clearTimeout(requestTimeout);
        reject(error);
      });

      req.write(JSON.stringify(data));
      req.end();
    });
  }

  async pull(params: { model: string }): Promise<void> {
    await this.makeRequest('/api/pull', 'POST', params);
  }
}

export interface OllamaConfig {
  host?: string;
  model?: string;
  visionModel?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProcessingStatus {
  stage: 'initializing' | 'analyzing_images' | 'extracting_text' | 'generating_solution' | 'finalizing' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export interface OllamaResponse {
  text: string;
  timestamp: number;
  metadata?: {
    model: string;
    processingTime: number;
    cached?: boolean;
  };
}

export class ElectronOllamaService {
  private ollama: HttpOllamaClient;
  private config: Required<OllamaConfig>;
  private statusCallback?: (status: ProcessingStatus) => void;
  private streamingCallback?: (partialText: string) => void;
  private modelCache: Set<string> = new Set();
  private responseCache: Map<string, { response: string; timestamp: number }> = new Map();

  constructor(config: OllamaConfig = {}) {
    this.config = {
      host: config.host || process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_MODEL || 'llama3.2-vision',
      visionModel: config.visionModel || process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision',
      temperature: config.temperature || parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
      maxTokens: config.maxTokens || parseInt(process.env.OLLAMA_MAX_TOKENS || '0'), // 0 = no limit
    };

    this.ollama = new HttpOllamaClient(this.config.host);
    

  }

  setStatusCallback(callback: (status: ProcessingStatus) => void) {
    this.statusCallback = callback;
  }

  setStreamingCallback(callback: (partialText: string) => void) {
    this.streamingCallback = callback;
  }

  private updateStatus(stage: ProcessingStatus['stage'], message: string, progress?: number) {
    if (this.statusCallback) {
      this.statusCallback({ stage, message, progress });
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  async ensureModelExists(modelName: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.modelCache.has(modelName)) {
        return true;
      }
      
      const models = await this.ollama.list();
      const modelExists = models.models.some((model: OllamaModel) => model.name.includes(modelName));
      
      if (!modelExists) {
        this.updateStatus('initializing', `Downloading ${modelName} model...`);
        await this.ollama.pull({ model: modelName });
      }
      
      // Cache the model existence
      this.modelCache.add(modelName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async analyzeScreenshots(screenshotPaths: string[]): Promise<OllamaResponse> {
    const startTime = Date.now();
    
    try {
      this.updateStatus('initializing', 'Preparing image analysis...', 10);
      
      // Check connection
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }

      // Ensure vision model exists
      this.updateStatus('initializing', 'Checking vision model...', 20);
      await this.ensureModelExists(this.config.visionModel);
      
      this.updateStatus('analyzing_images', `Analyzing ${screenshotPaths.length} screenshot(s)...`, 30);
      
      // Convert images to base64
      const base64Images = screenshotPaths.map(imagePath => {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Screenshot file not found: ${imagePath}`);
        }
        const imageBuffer = fs.readFileSync(imagePath);
        return imageBuffer.toString('base64');
      });

      const prompt = `Analyze these interview/coding screenshots carefully. Extract and identify:

1. **Problem Statement**: Any coding problems, interview questions, or technical challenges
2. **Code Content**: Programming code, algorithms, data structures, or technical implementations
3. **UI Elements**: Buttons, forms, interfaces, or interactive components
4. **Error Messages**: Any error outputs, warnings, or system messages
5. **Test Cases**: Input/output examples, test scenarios, or expected results
6. **Technical Details**: APIs, databases, frameworks, or technical specifications

Provide a comprehensive, structured analysis that captures all relevant technical information for solving coding/interview problems.`;

      this.updateStatus('analyzing_images', 'Processing with vision model...', 60);

      const response = await this.ollama.generate({
        model: this.config.visionModel,
        prompt,
        images: base64Images,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      this.updateStatus('complete', 'Image analysis completed', 100);

      return {
        text: response.response,
        timestamp: Date.now(),
        metadata: {
          model: this.config.visionModel,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.updateStatus('error', `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async generateSolution(imageAnalysis: string, additionalContext?: string): Promise<OllamaResponse> {
    const startTime = Date.now();
    
    try {
      this.updateStatus('generating_solution', 'Generating comprehensive solution...', 70);
      
      await this.ensureModelExists(this.config.model);
      
      const prompt = `Based on the following image analysis, provide a comprehensive solution for this coding/interview problem:

## Image Analysis:
${imageAnalysis}

${additionalContext ? `## Additional Context:\n${additionalContext}` : ''}

## Please provide a complete solution including:

1. **Problem Understanding**: Clear explanation of what needs to be solved
2. **Approach**: Step-by-step solution strategy
3. **Implementation**: Complete, working code with proper syntax highlighting
4. **Explanation**: Line-by-line code explanation for complex parts
5. **Time & Space Complexity**: Big O analysis
6. **Edge Cases**: Important considerations and edge cases
7. **Testing**: Example test cases and expected outputs
8. **Optimization**: Potential improvements or alternative approaches

Format your response clearly with proper markdown formatting for code blocks. Focus on providing accurate, interview-ready solutions.`;

      this.updateStatus('generating_solution', 'Processing with language model...', 85);

      const response = await this.ollama.generate({
        model: this.config.model,
        prompt,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      });

      this.updateStatus('complete', 'Solution generated successfully', 100);

      return {
        text: response.response,
        timestamp: Date.now(),
        metadata: {
          model: this.config.model,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.updateStatus('error', `Solution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async processInterviewQuestion(screenshotPaths: string[], additionalContext?: string): Promise<OllamaResponse> {
    const startTime = Date.now();
    
    try {
      this.updateStatus('initializing', 'Starting interview analysis...', 5);
      
      // Step 1: Analyze screenshots
      const imageAnalysis = await this.analyzeScreenshots(screenshotPaths);
      
      // Step 2: Generate solution
      this.updateStatus('generating_solution', 'Creating comprehensive solution...', 50);
      const solution = await this.generateSolution(imageAnalysis.text, additionalContext);

      this.updateStatus('finalizing', 'Finalizing response...', 95);

      const combinedResponse = `# Interview Problem Analysis & Solution

## 📸 Screenshot Analysis
${imageAnalysis.text}

---

## 💡 Complete Solution
${solution.text}

---

*Analysis completed in ${Date.now() - startTime}ms using ${this.config.visionModel} + ${this.config.model}*`;

      this.updateStatus('complete', 'Interview question processed successfully', 100);

      return {
        text: combinedResponse,
        timestamp: Date.now(),
        metadata: {
          model: `${this.config.visionModel} + ${this.config.model}`,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.updateStatus('error', `Interview processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async askQuestion(question: string, context?: string): Promise<OllamaResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache for recent identical questions (within 1 hour)
      const cacheKey = `${question}:${context || ''}`;
      const cached = this.responseCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 3600000) { // 1 hour cache
        this.updateStatus('complete', 'Retrieved from cache', 100);
        return {
          text: cached.response,
          timestamp: Date.now(),
          metadata: {
            model: this.config.model,
            processingTime: Date.now() - startTime,
            cached: true
          }
        };
      }
      
      this.updateStatus('initializing', 'Processing question...', 20);
      
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }

      await this.ensureModelExists(this.config.model);
      
      this.updateStatus('generating_solution', 'Generating response...', 60);
      
      const prompt = `Answer in EXACTLY 3-4 lines maximum. Be precise and complete.

Format:
- Line 1: Direct answer
- Line 2-3: Key explanation/solution
- Line 4: Example/conclusion (if needed)

For coding: Show working code + brief explanation in 3-4 lines total.
For any question: Complete answer in 3-4 lines maximum.
Use markdown formatting.

${context ? `Context: ${context}\n\n` : ''}Question: ${question}

Answer (3-4 lines max):`;

      const response = await this.ollama.generate({
        model: this.config.model,
        prompt,
        options: {
          temperature: 0.3, // Lower temperature for more accurate responses
          num_predict: 100, // Strict limit for 3-4 line responses
        },
      }, this.streamingCallback);

      this.updateStatus('complete', 'Response generated', 100);

      // Cache the response for future use
      this.responseCache.set(cacheKey, {
        response: response.response,
        timestamp: Date.now()
      });
      
      // Limit cache size to prevent memory issues
      if (this.responseCache.size > 100) {
        const oldestKey = this.responseCache.keys().next().value;
        if (oldestKey) {
          this.responseCache.delete(oldestKey);
        }
      }

      const result = {
        text: response.response,
        timestamp: Date.now(),
        metadata: {
          model: this.config.model,
          processingTime: Date.now() - startTime,
        },
      };
      return result;
    } catch (error) {
      this.updateStatus('error', `Question processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async transcribeAudio(_audioPath: string): Promise<{ text: string; timestamp: number }> {
    // Mock implementation for now
    // In production, integrate with Whisper.cpp or similar
    return {
      text: "Audio transcription not yet implemented. Please implement Whisper integration.",
      timestamp: Date.now(),
    };
  }
}

export const electronOllamaService = new ElectronOllamaService();