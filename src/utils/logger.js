import chalk from 'chalk';
import ora from 'ora';

const spinners = {};

const logger = {
  log: (level, message, value = '', spinner = false) => {
    const now = new Date().toISOString();
    const timestamp = chalk.gray(`[${now}]`);
    
    const levelColors = {
      info: chalk.blue('ℹ'),
      warn: chalk.yellow('⚠'),
      error: chalk.red('✖'),
      success: chalk.green('✔'),
      debug: chalk.magenta('⚙')
    };

    const levelIcon = levelColors[level] || '•';
    
    if (spinner) {
      if (!spinners[message]) {
        spinners[message] = ora({
          text: `${message}`,
          color: level === 'error' ? 'red' : 'cyan'
        }).start();
      }
      if (level === 'success' || level === 'error') {
        if (level === 'success') {
          spinners[message].succeed(chalk.green(`${message} ${value}`));
        } else {
          spinners[message].fail(chalk.red(`${message} ${value}`));
        }
        delete spinners[message];
      } else {
        spinners[message].text = `${message} ${value}`;
      }
      return;
    }

    let formattedValue = '';
    if (typeof value === 'object') {
      if (value !== null && Object.keys(value).length > 0) {
        formattedValue = '\n' + Object.entries(value)
          .map(([k, v]) => `  ${chalk.gray('┌')} ${chalk.cyan(k)}: ${chalk.white(v)}`)
          .join('\n');
      }
    } else if (value) {
      formattedValue = ` ${chalk.white(value)}`;
    }

    console.log(`${timestamp} ${levelIcon} ${message}${formattedValue}`);
  },

  info: (message, value = '', spinner = false) => logger.log('info', message, value, spinner),
  warn: (message, value = '', spinner = false) => logger.log('warn', message, value, spinner),
  error: (message, value = '', spinner = false) => logger.log('error', message, value, spinner),
  success: (message, value = '', spinner = false) => logger.log('success', message, value, spinner),
  debug: (message, value = '', spinner = false) => logger.log('debug', message, value, spinner),
  
  startSpinner: (message) => {
    return ora({
      text: message,
      color: 'cyan'
    }).start();
  }
};

export default logger;
