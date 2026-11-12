import React from 'react'
import { AlertCircle, HelpCircle } from 'lucide-react'
import { Modal, ModalFooter } from './Modal'
import { Button } from './Button'

export interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد العملية',
  cancelText = 'إلغاء',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center p-2">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-gym-primary-dark border border-amber-200 flex items-center justify-center mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold font-cairo text-gym-text mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-gym-text-muted mb-6 leading-relaxed font-body">{description}</p>
        )}

        <ModalFooter className="w-full justify-center gap-3 pt-2 border-t-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="primary"
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

export const DangerConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'نعم، حذف نهائي',
  cancelText = 'تراجع',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center p-2">
        <div className="w-12 h-12 rounded-full bg-red-50 text-gym-error border border-red-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold font-cairo text-gym-text mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-gym-text-muted mb-6 leading-relaxed font-body">{description}</p>
        )}

        <ModalFooter className="w-full justify-center gap-3 pt-2 border-t-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="danger"
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
