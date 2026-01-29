// Section-based navigation for screens - Simplified
import { useState, useCallback } from "react";

export interface SectionConfig {
  id: string;
  items: string[];
}

export function useSectionNav(sections: SectionConfig[]) {
  const [activeSection, setActiveSection] = useState(0);
  const [activeItem, setActiveItem] = useState(0);

  const currentSection = sections[activeSection];

  const navigateItems = useCallback((delta: number) => {
    if (!currentSection) return;
    
    setActiveItem((prev) => {
      const newIndex = prev + delta;
      return Math.max(0, Math.min(newIndex, currentSection.items.length - 1));
    });
  }, [currentSection]);

  const focusItem = useCallback((sectionIndex: number, itemIndex: number) => {
    setActiveSection(sectionIndex);
    setActiveItem(itemIndex);
  }, []);

  return {
    activeSection,
    activeItem,
    currentSectionId: currentSection?.id,
    focusItem,
    navigateItems,
    setActiveSection,
    setActiveItem,
  };
}
