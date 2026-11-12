import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, ModalFooter } from './Modal'
import { Button } from './Button'

export interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isDestructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-gym-gold'
          }`}
        >
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-zinc-900 mb-1">{title}</h3>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">{message}</p>

        <ModalFooter className="w-full justify-center gap-3 pt-0 border-t-0 mt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
