import { create } from 'zustand';

interface ModalState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  resolve: ((value: any) => void) | null;
}

export const useModalStore = create<ModalState>(() => ({
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
  resolve: null,
}));

export const showAlert = (title: string, message: string): Promise<void> => {
  return new Promise((resolve) => {
    useModalStore.setState({
      isOpen: true,
      type: 'alert',
      title,
      message,
      resolve,
    });
  });
};

export const showConfirm = (title: string, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    useModalStore.setState({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      resolve,
    });
  });
};

export const closeModal = (value: any) => {
  const { resolve } = useModalStore.getState();
  if (resolve) resolve(value);
  useModalStore.setState({ isOpen: false, resolve: null });
};
