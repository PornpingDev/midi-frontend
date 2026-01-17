import React, { ReactNode } from 'react';
import { Modal } from 'react-bootstrap';

type CustomModalProps = {
  show: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl' | 'xxl'; // เพิ่ม 'xxl'
};

const CustomModal: React.FC<CustomModalProps> = ({
  show,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
}) => {
  // ตรวจสอบขนาด ถ้าเป็น xxl → ใช้ style แบบกำหนดเอง
  const isXXL = size === 'xxl';

  return (
    <Modal
      show={show}
      onHide={onClose}
      size={isXXL ? undefined : size}
      centered
      backdrop="static"
      dialogClassName={isXXL ? 'custom-modal-xxl' : undefined}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      {footer && <Modal.Footer>{footer}</Modal.Footer>}
    </Modal>
  );
};

export default CustomModal;
