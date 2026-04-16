import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { copyShareLink } from '../utils/share'

export default function ShareModal({ trip, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState(false)

  const handleCopy = async () => {
    const success = await copyShareLink(trip)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } else {
      setShareError(true)
    }
  }

  return (
    <Modal isOpen onClose={onClose} placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="font-heading text-xl">Share Trip</h2>
          <p className="text-sm font-normal text-default-500">
            Generate a read-only link for this itinerary
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-3 p-3 rounded-medium bg-primary/10 border border-primary/20">
            <i className="fas fa-link text-primary mt-1" />
            <p className="text-sm text-default-600">
              The link contains the full itinerary. Anyone who opens it can view it but not modify it.
            </p>
          </div>

          <Button
            color={copied ? 'success' : 'primary'}
            onPress={handleCopy}
            startContent={<i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />}
            fullWidth
            size="lg"
          >
            {copied ? 'Link copied!' : 'Copy Link'}
          </Button>

          {shareError && (
            <div className="flex items-start gap-2 p-3 rounded-medium bg-danger/10 border border-danger/20 text-sm text-danger">
              <i className="fas fa-exclamation-triangle mt-1" />
              <span>Unable to generate the link. The trip may be too long to share via URL.</span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
