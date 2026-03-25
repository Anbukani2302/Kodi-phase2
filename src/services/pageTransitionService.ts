// services/pageTransitionService.ts
// Service to handle smooth page transitions and prevent white screens

import { cacheService } from './cacheService';

interface PageState {
  [key: string]: any;
}

class PageTransitionService {
  private pageStates = new Map<string, PageState>();
  private activePages = new Set<string>();

  // Save page state before navigation
  savePageState(pageKey: string, state: PageState): void {
    try {
      this.pageStates.set(pageKey, { ...state });
      console.log(`💾 Saved state for page: ${pageKey}`);
    } catch (error) {
      console.error(`Error saving state for page ${pageKey}:`, error);
    }
  }

  // Get saved page state
  getPageState(pageKey: string): PageState | null {
    try {
      const state = this.pageStates.get(pageKey);
      if (state) {
        console.log(`📂 Retrieved state for page: ${pageKey}`);
        return state;
      }
      return null;
    } catch (error) {
      console.error(`Error getting state for page ${pageKey}:`, error);
      return null;
    }
  }

  // Mark page as active (don't hide)
  markPageActive(pageKey: string): void {
    try {
      this.activePages.add(pageKey);
      console.log(`✅ Page marked as active: ${pageKey}`);
    } catch (error) {
      console.error(`Error marking page ${pageKey} as active:`, error);
    }
  }

  // Mark page as inactive
  markPageInactive(pageKey: string): void {
    try {
      this.activePages.delete(pageKey);
      console.log(`❌ Page marked as inactive: ${pageKey}`);
    } catch (error) {
      console.error(`Error marking page ${pageKey} as inactive:`, error);
    }
  }

  // Check if page is active
  isPageActive(pageKey: string): boolean {
    return this.activePages.has(pageKey);
  }

  // Clear page state
  clearPageState(pageKey: string): void {
    this.pageStates.delete(pageKey);
    this.activePages.delete(pageKey);
    console.log(`🗑️ Cleared state for page: ${pageKey}`);
  }

  // Clear all page states
  clearAllStates(): void {
    this.pageStates.clear();
    this.activePages.clear();
    console.log(`🗑️ Cleared all page states`);
  }

  // Preload page data for instant transitions
  async preloadPageData(pageKey: string, dataLoader: () => Promise<any>): Promise<void> {
    try {
      console.log(`🚀 Preloading data for page: ${pageKey}`);
      const data = await dataLoader();
      this.savePageState(pageKey, { data, preloaded: true, timestamp: Date.now() });
    } catch (error) {
      console.error(`❌ Failed to preload data for ${pageKey}:`, error);
    }
  }

  // Get cached or preloaded data with fallback
  async getOrLoadData<T>(
    cacheKey: string,
    dataLoader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = cacheService.get<T>(cacheKey);
    if (cached) {
      console.log(` Cache hit for: ${cacheKey}`);
      return cached;
    }

    // Try preloaded state
    const preloaded = this.getPreloadedData(cacheKey);
    if (preloaded) {
      console.log(`⚡ Using preloaded data for: ${cacheKey}`);
      return preloaded;
    }

    // Load fresh data
    console.log(`🔄 Loading fresh data for: ${cacheKey}`);
    const data = await dataLoader();
    cacheService.set(cacheKey, data, ttl);
    return data;
  }

  // Get preloaded data
  private getPreloadedData(cacheKey: string): any {
    for (const [pageKey, state] of this.pageStates.entries()) {
      if (state.preloaded && state.data && Date.now() - state.timestamp < 5 * 60 * 1000) {
        return state.data;
      }
    }
    return null;
  }

  // Handle page transition with smooth animation
  async transitionToPage(
    fromPage: string,
    toPage: string,
    transitionCallback?: () => Promise<void>
  ): Promise<void> {
    console.log(`🔄 Transitioning from ${fromPage} to ${toPage}`);

    try {
      // Mark destination page as active
      this.markPageActive(toPage);

      // Execute transition callback if provided
      if (transitionCallback) {
        await transitionCallback();
      }

      // Mark source page as inactive after transition
      setTimeout(() => {
        this.markPageInactive(fromPage);
      }, 100); // Small delay to prevent white screen

    } catch (error) {
      console.error(`❌ Transition failed from ${fromPage} to ${toPage}:`, error);
      // Ensure both pages are active on error
      this.markPageActive(fromPage);
      this.markPageActive(toPage);
    }
  }
}

export const pageTransitionService = new PageTransitionService();

// Helper function to create page keys
export const createPageKey = (route: string, params?: any): string => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${route}${paramString}`;
};

// React hook for page transitions
export const usePageTransition = (pageKey: string) => {
  const saveState = (state: any) => {
    try {
      pageTransitionService.savePageState(pageKey, state);
    } catch (error) {
      console.error('Error saving page state:', error);
    }
  };

  const getState = () => {
    try {
      return pageTransitionService.getPageState(pageKey);
    } catch (error) {
      console.error('Error getting page state:', error);
      return null;
    }
  };

  const markActive = () => {
    try {
      pageTransitionService.markPageActive(pageKey);
    } catch (error) {
      console.error('Error marking page active:', error);
    }
  };

  const markInactive = () => {
    try {
      pageTransitionService.markPageInactive(pageKey);
    } catch (error) {
      console.error('Error marking page inactive:', error);
    }
  };

  return {
    saveState,
    getState,
    markActive,
    markInactive,
    isActive: pageTransitionService.isPageActive(pageKey)
  };
};
