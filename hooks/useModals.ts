'use client';

import { useState, useCallback } from 'react';

type ModalName = 
  | 'auth'
  | 'share'
  | 'instagram'
  | 'search'
  | 'saveQuote'
  | 'customization'
  | 'createQuote'
  | 'onboarding'
  | 'sidebar'
  | 'optionsMenu';

interface ModalState {
  auth: boolean;
  share: boolean;
  instagram: boolean;
  search: boolean;
  saveQuote: boolean;
  customization: boolean;
  createQuote: boolean;
  onboarding: boolean;
  sidebar: boolean;
  optionsMenu: boolean;
}

interface UseModalsReturn {
  modals: ModalState;
  openModal: (name: ModalName) => void;
  closeModal: (name: ModalName) => void;
  toggleModal: (name: ModalName) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
}

const initialState: ModalState = {
  auth: false,
  share: false,
  instagram: false,
  search: false,
  saveQuote: false,
  customization: false,
  createQuote: false,
  onboarding: false,
  sidebar: false,
  optionsMenu: false,
};

export function useModals(): UseModalsReturn {
  const [modals, setModals] = useState<ModalState>(initialState);

  const openModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  const toggleModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(initialState);
  }, []);

  const isAnyModalOpen = Object.values(modals).some(Boolean);

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isAnyModalOpen,
  };
}

// Re-export for backward compatibility with individual state management
export function useModalStates() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSaveQuoteModal, setShowSaveQuoteModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  return {
    showAuthModal, setShowAuthModal,
    showShareModal, setShowShareModal,
    showInstagramModal, setShowInstagramModal,
    showSearchModal, setShowSearchModal,
    showSaveQuoteModal, setShowSaveQuoteModal,
    showCustomizationModal, setShowCustomizationModal,
    showCreateQuoteModal, setShowCreateQuoteModal,
    showOnboarding, setShowOnboarding,
    isSidebarOpen, setIsSidebarOpen,
    showOptionsMenu, setShowOptionsMenu,
  };
}

