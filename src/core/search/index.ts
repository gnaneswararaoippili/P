import { SearchManager } from './SearchManager';
import { AppSearchProvider } from './providers/AppSearchProvider';
import { CommandSearchProvider } from './providers/CommandSearchProvider';
import { VFSSearchProvider } from './providers/VFSSearchProvider';

export const registerSearchProviders = () => {
  SearchManager.registerProvider(AppSearchProvider);
  SearchManager.registerProvider(CommandSearchProvider);
  SearchManager.registerProvider(VFSSearchProvider);
};

export { SearchManager };
export type { SearchResult } from './SearchManager';
