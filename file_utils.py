from pathlib import Path
from uuid import uuid4

from PyPDF2 import PdfReader

try:
    import docx
except ImportError:  # pragma: no cover
    docx = None


UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx"}


def save_uploaded_file(file_name: str, file_bytes: bytes) -> str:
    upload_path = Path(UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    original = Path(file_name or "contract.txt")
    suffix = original.suffix.lower()
    safe_stem = "".join(ch for ch in original.stem if ch.isalnum() or ch in ("-", "_")) or "contract"
    unique_name = f"{safe_stem}-{uuid4().hex[:8]}{suffix}"
    file_path = upload_path / unique_name

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    return str(file_path)


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_text_from_docx(file_path: str) -> str:
    if docx is None:
        raise RuntimeError("python-docx is not installed. Add python-docx to requirements.txt.")
    document = docx.Document(file_path)
    return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text)


def extract_text(file_path: str) -> str:
    suffix = Path(file_path).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only PDF, DOCX, and TXT files are supported.")
    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    if suffix == ".docx":
        return extract_text_from_docx(file_path)
    return extract_text_from_txt(file_path)
