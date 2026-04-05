"""
Document Processing Service
Handles PDF extraction, OCR, and text preprocessing.
Supports very large PDFs (20 MB+) by chunking extracted text.
"""

import os
import io
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

try:
    from pdf2image import convert_from_path
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

logger = logging.getLogger(__name__)

# Maximum characters sent per AI call.
# GPT-4o context window: ~128 k tokens ≈ ~400 k chars.
# We keep a safe margin and chunk at 300 k chars (~75 k tokens).
MAX_CHARS_PER_CHUNK = int(os.getenv('AI_MAX_CHARS_PER_CHUNK', '300000'))


class DocumentProcessor:
    """
    Service for processing and extracting text from various document formats.
    Supports PDF text extraction and OCR for scanned documents.
    No artificial file-size limit – large files are handled via text chunking.
    """

    def __init__(self):
        self.ocr_enabled = os.getenv('AI_OCR_ENABLED', 'true').lower() == 'true' and OCR_AVAILABLE
        # max_file_size_mb == 0 means "no limit"
        raw = int(os.getenv('AI_MAX_DOCUMENT_SIZE_MB', '0'))
        self.max_file_size_mb = raw  # 0 → unlimited

        if self.ocr_enabled:
            logger.info("DocumentProcessor initialized with OCR support")
        else:
            logger.info("DocumentProcessor initialized without OCR support")

    def _check_size(self, size_mb: float, filename: str = ''):
        """Raise only if a positive limit is set and the file exceeds it."""
        if self.max_file_size_mb > 0 and size_mb > self.max_file_size_mb:
            raise ValueError(
                f"File '{filename}' ({size_mb:.1f} MB) exceeds the configured "
                f"maximum of {self.max_file_size_mb} MB."
            )

    def process_document(
        self,
        file_path: str,
        document_type: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Process a document and extract text content.
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Document not found: {file_path}")

        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        self._check_size(file_size_mb, file_path.name)

        suffix = file_path.suffix.lower()

        if suffix == '.pdf':
            return self._process_pdf(file_path, document_type)
        elif suffix in ['.txt', '.text']:
            return self._process_text_file(file_path, document_type)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

    def process_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Process document from bytes.
        """
        file_size_mb = len(file_bytes) / (1024 * 1024)
        self._check_size(file_size_mb, filename)

        suffix = Path(filename).suffix.lower()

        if suffix == '.pdf':
            return self._process_pdf_bytes(file_bytes, filename, document_type)
        elif suffix in ['.txt', '.text']:
            return self._process_text_bytes(file_bytes, filename, document_type)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _chunk_text(self, text: str) -> List[str]:
        """Split large text into chunks that fit within AI context limits."""
        if len(text) <= MAX_CHARS_PER_CHUNK:
            return [text]
        chunks = []
        for start in range(0, len(text), MAX_CHARS_PER_CHUNK):
            chunks.append(text[start:start + MAX_CHARS_PER_CHUNK])
        logger.info(f"Text split into {len(chunks)} chunks of ~{MAX_CHARS_PER_CHUNK} chars each")
        return chunks

    def _process_pdf(
        self,
        file_path: Path,
        document_type: str
    ) -> Dict[str, Any]:
        """Process PDF file."""
        try:
            reader = PdfReader(str(file_path))
            text_content = []
            total_pages = len(reader.pages)

            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ''
                if text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{text}")

            extracted_text = "\n\n".join(text_content)

            # If text extraction yields little content, try OCR
            if len(extracted_text.strip()) < 100 and self.ocr_enabled:
                logger.info(f"PDF appears to be scanned, attempting OCR: {file_path.name}")
                extracted_text = self._ocr_pdf(file_path)

            chunks = self._chunk_text(extracted_text)
            return {
                "filename": file_path.name,
                "document_type": document_type,
                "total_pages": total_pages,
                "content": extracted_text,
                "chunks": chunks,
                "total_chunks": len(chunks),
                "extraction_method": "OCR" if len(extracted_text.strip()) < 100 and self.ocr_enabled else "text",
                "file_size_mb": file_path.stat().st_size / (1024 * 1024)
            }

        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {str(e)}")
            raise

    def _process_pdf_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: str
    ) -> Dict[str, Any]:
        """Process PDF from bytes."""
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text_content = []
            total_pages = len(reader.pages)

            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ''
                if text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{text}")

            extracted_text = "\n\n".join(text_content)

            extraction_method = "text"
            if len(extracted_text.strip()) < 100:
                logger.warning(f"PDF may be scanned (little text extracted): {filename}")
                extraction_method = "text_limited"

            chunks = self._chunk_text(extracted_text)
            return {
                "filename": filename,
                "document_type": document_type,
                "total_pages": total_pages,
                "content": extracted_text,
                "chunks": chunks,
                "total_chunks": len(chunks),
                "extraction_method": extraction_method,
                "file_size_mb": len(file_bytes) / (1024 * 1024)
            }

        except Exception as e:
            logger.error(f"Error processing PDF bytes {filename}: {str(e)}")
            raise

    def _process_text_file(
        self,
        file_path: Path,
        document_type: str
    ) -> Dict[str, Any]:
        """Process text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()

        chunks = self._chunk_text(content)
        return {
            "filename": file_path.name,
            "document_type": document_type,
            "total_pages": 1,
            "content": content,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "extraction_method": "text",
            "file_size_mb": file_path.stat().st_size / (1024 * 1024)
        }

    def _process_text_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: str
    ) -> Dict[str, Any]:
        """Process text file from bytes."""
        try:
            content = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            content = file_bytes.decode('latin-1')

        chunks = self._chunk_text(content)
        return {
            "filename": filename,
            "document_type": document_type,
            "total_pages": 1,
            "content": content,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "extraction_method": "text",
            "file_size_mb": len(file_bytes) / (1024 * 1024)
        }

    def _ocr_pdf(self, file_path: Path) -> str:
        """Perform OCR on a PDF file."""
        if not self.ocr_enabled:
            raise RuntimeError("OCR is not available. Install pdf2image, pillow, and pytesseract.")

        try:
            images = convert_from_path(str(file_path))
            text_content = []

            for page_num, image in enumerate(images, 1):
                text = pytesseract.image_to_string(image)
                text_content.append(f"--- Page {page_num} ---\n{text}")

            return "\n\n".join(text_content)

        except Exception as e:
            logger.error(f"OCR failed for {file_path}: {str(e)}")
            raise

    def batch_process(
        self,
        file_paths: List[str],
        document_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Process multiple documents in batch.
        """
        if document_types is None:
            document_types = ["unknown"] * len(file_paths)

        results = []
        for file_path, doc_type in zip(file_paths, document_types):
            try:
                result = self.process_document(file_path, doc_type)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {str(e)}")
                results.append({
                    "filename": Path(file_path).name,
                    "document_type": doc_type,
                    "error": str(e),
                    "content": "",
                    "chunks": [],
                    "total_chunks": 0,
                })

        return results


# Singleton instance
_processor = None


def get_document_processor() -> DocumentProcessor:
    """Get or create the document processor singleton."""
    global _processor
    if _processor is None:
        _processor = DocumentProcessor()
    return _processor
