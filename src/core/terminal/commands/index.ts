import { registry } from '../registry';
import { echoCommand } from './echo';
import { clearCommand } from './clear';
import { dateCommand } from './date';
import { whoamiCommand } from './whoami';
import { helpCommand } from './help';
import { pwdCommand } from './pwd';
import { lsCommand } from './ls';
import { cdCommand } from './cd';
import { mkdirCommand } from './mkdir';
import { touchCommand } from './touch';
import { psCommand } from './ps';
import { killCommand } from './kill';
import { appsCommand } from './apps';
import { openCommand } from './open';
import { rmCommand } from './rm';
import { cpCommand } from './cp';
import { mvCommand } from './mv';
import { catCommand } from './cat';

// Register all built-in commands
export const registerBuiltInCommands = () => {
  registry.register(helpCommand);
  registry.register(clearCommand);
  registry.register(dateCommand);
  registry.register(whoamiCommand);
  registry.register(echoCommand);
  
  registry.register(lsCommand);
  registry.register(cdCommand);
  registry.register(pwdCommand);
  registry.register(mkdirCommand);
  registry.register(touchCommand);
  registry.register(catCommand);
  
  registry.register(psCommand);
  registry.register(killCommand);
  
  registry.register(appsCommand);
  registry.register(openCommand);
  registry.register(rmCommand);
  registry.register(cpCommand);
  registry.register(mvCommand);
};
