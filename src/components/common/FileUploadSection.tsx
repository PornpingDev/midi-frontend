import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Form, Spinner } from "react-bootstrap";
import { Trash } from "lucide-react";
import AlertToast from "../common/AlertToast";
import AlertModal from "../common/AlertModal";

type FileType = "drawing" | "product-image" | "qc-document";

type FileUploadSectionProps = {
  productNo: string;
  fileType: FileType;
};

type ProductFile = {
  id: number;
  file_name: string;
  file_url: string;
  file_type: FileType;
};

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ productNo, fileType }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileList, setFileList] = useState<ProductFile[]>([]);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "success" | "danger" }>({
    show: false,
    message: "",
    variant: "success",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; fileId: number | null }>({
    show: false,
    fileId: null,
  });

  // ✅ โหลดไฟล์เมื่อเปิด modal
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/products/${productNo}/files?file_type=${fileType}`);
      setFileList(res.data.files || []);
    } catch (err) {
      setToast({ show: true, message: "เกิดข้อผิดพลาดในการโหลดไฟล์", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("file_type", fileType);

    try {
      setLoading(true);
      await axios.post(`/api/products/${productNo}/files`, formData);
      setToast({ show: true, message: "อัปโหลดไฟล์สำเร็จ", variant: "success" });
      setSelectedFiles([]);
      fetchFiles();
    } catch (err) {
      setToast({ show: true, message: "อัปโหลดไฟล์ไม่สำเร็จ", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.fileId) return;

    try {
      await axios.delete(`/api/product-files/${deleteConfirm.fileId}`);
      setToast({ show: true, message: "ลบไฟล์เรียบร้อย", variant: "success" });
      setFileList((prev) => prev.filter((f) => f.id !== deleteConfirm.fileId));
    } catch (err) {
      setToast({ show: true, message: "เกิดข้อผิดพลาดในการลบ", variant: "danger" });
    } finally {
      setDeleteConfirm({ show: false, fileId: null });
    }
  };

  return (
    <div className="mb-4">
      <h6 className="mb-2">{getFileTypeLabel(fileType)}</h6>

      <Form.Control type="file" multiple onChange={handleFileChange} className="mb-2" />
      <Button onClick={handleUpload} disabled={loading || selectedFiles.length === 0}>
        {loading ? <Spinner size="sm" animation="border" /> : "อัปโหลด"}
      </Button>

      <ul className="mt-3 list-unstyled">
        {fileList.map((file) => (
          <li key={file.id} className="d-flex align-items-center justify-content-between border-bottom py-1">
            <a href={file.file_url} target="_blank" rel="noopener noreferrer">
              {file.file_name}
            </a>
            <Button variant="outline-danger" size="sm" onClick={() => setDeleteConfirm({ show: true, fileId: file.id })}>
              <Trash size={16} />
            </Button>
          </li>
        ))}
      </ul>

      <AlertToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <AlertModal
        show={deleteConfirm.show}
        title="ยืนยันการลบไฟล์"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์นี้?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false, fileId: null })}
      />
    </div>
  );
};

function getFileTypeLabel(fileType: FileType): string {
  switch (fileType) {
    case "drawing":
      return "Drawing (แบบสินค้า)";
    case "product-image":
      return "Product Image (รูปสินค้า)";
    case "qc-document":
      return "QC Document (ใบตรวจสอบคุณภาพ)";
    default:
      return "";
  }
}

export default FileUploadSection;
