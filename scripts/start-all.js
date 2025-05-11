/**
 * Helper script to start all components of the Radius Negotiation Demo
 */
const { spawn } = require('child_process');
const path = require('path');

// Define the commands to run
const commands = [
  { name: 'server', cmd: 'npm', args: ['run', 'server'] },
  { name: 'agents', cmd: 'npm', args: ['run', 'start-agents'] },
  { name: 'ui', cmd: 'npm', args: ['run', 'ui'] }
];

// Store process references
const processes = {};

// Helper function to format output with timestamps and colors
function formatOutput(name, data) {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    server: '\x1b[36m', // cyan
    agents: '\x1b[32m', // green
    ui: '\x1b[35m',     // magenta
    reset: '\x1b[0m'
  };
  
  return `${colors[name] || ''}[${timestamp}][${name}] ${data.toString().trim()}${colors.reset}`;
}

// Start each process
commands.forEach(({ name, cmd, args }) => {
  console.log(`Starting ${name}...`);
  
  const proc = spawn(cmd, args, {
    stdio: 'pipe',
    shell: true
  });
  
  processes[name] = proc;
  
  // Handle stdout
  proc.stdout.on('data', (data) => {
    console.log(formatOutput(name, data));
  });
  
  // Handle stderr
  proc.stderr.on('data', (data) => {
    console.error(formatOutput(name, data));
  });
  
  // Handle process exit
  proc.on('close', (code) => {
    console.log(`${name} process exited with code ${code}`);
    delete processes[name];
    
    // Check if all processes have exited
    if (Object.keys(processes).length === 0) {
      console.log('All processes have exited, shutting down...');
      process.exit(0);
    }
  });
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down all processes...');
  
  // Kill all child processes
  Object.entries(processes).forEach(([name, proc]) => {
    console.log(`Terminating ${name}...`);
    proc.kill('SIGINT');
  });
  
  // Exit after a timeout to ensure clean shutdown
  setTimeout(() => {
    console.log('Exiting...');
    process.exit(0);
  }, 1000);
});

console.log('\n🚀 Radius Negotiation Demo is running!');
console.log('📊 Dashboard: http://localhost:3000');
console.log('🔌 WebSocket: ws://localhost:8080/ws');
console.log('🌐 API: http://localhost:8080/api');
console.log('\nPress Ctrl+C to stop all services\n'); 