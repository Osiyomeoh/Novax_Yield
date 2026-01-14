import React, { useState } from 'react';
import { runIntegrationTest, IntegrationTestResult } from '../../services/integration-test';
import Button from '../UI/Button';
import { Card } from '../UI/Card';

export const IntegrationTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<IntegrationTestResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      const testResults = await runIntegrationTest();
      setResults(testResults);
      setLastRun(new Date());
    } catch (error) {
      console.error('Integration test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'SKIP': return '⏭️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-primary-blue';
      case 'FAIL': return 'text-red-500';
      case 'SKIP': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🚀 TrustBridge Integration Test
        </h1>
        <p className="text-gray-400">
          Test the complete frontend-backend integration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary-blue">{passed}</div>
          <div className="text-sm text-gray-400">Passed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{failed}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{skipped}</div>
          <div className="text-sm text-gray-400">Skipped</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{successRate}%</div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </Card>
      </div>

      <div className="mb-6">
        <Button
          onClick={handleRunTest}
          disabled={isRunning}
          className="w-full md:w-auto"
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run Integration Test'}
        </Button>
        
        {lastRun && (
          <p className="text-sm text-gray-400 mt-2">
            Last run: {lastRun.toLocaleString()}
          </p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">
            Test Results
          </h2>
          
          {results.map((result, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getStatusIcon(result.status)}</span>
                    <h3 className="font-semibold text-white">{result.testName}</h3>
                    <span className={`text-sm ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{result.message}</p>
                  
                  {result.error && (
                    <div className="bg-red-900/20 border border-red-500/20 rounded p-2 mt-2">
                      <p className="text-red-400 text-xs font-mono">{result.error}</p>
                    </div>
                  )}
                  
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                        View Data
                      </summary>
                      <pre className="text-xs text-gray-300 mt-2 bg-gray-800 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">
            Integration Status
          </h3>
          {passed === total ? (
            <div className="text-primary-blue">
              <p className="font-semibold">🎉 100% SUCCESS!</p>
              <p className="text-sm">All systems operational and ready for production!</p>
            </div>
          ) : passed > 0 ? (
            <div className="text-yellow-400">
              <p className="font-semibold">⚠️ Partial Success</p>
              <p className="text-sm">Core functionality working, some features need attention</p>
            </div>
          ) : (
            <div className="text-red-400">
              <p className="font-semibold">❌ Integration Issues</p>
              <p className="text-sm">Frontend-backend connection not working properly</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
