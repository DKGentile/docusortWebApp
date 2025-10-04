import { type ChangeEventHandler, type DragEventHandler, useRef } from 'react'

type FileUploaderProps = {
  onUpload: (files: File[]) => void
  isUploading?: boolean
}

const FileUploader = ({ onUpload, isUploading }: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSelectFiles = () => {
    inputRef.current?.click()
  }

  const handleChange: ChangeEventHandler<HTMLInputElement> = event => {
    const files = Array.from(event.target.files ?? [])
    if (files.length) {
      onUpload(files)
    }
    event.target.value = ''
  }

  const handleDrop: DragEventHandler<HTMLDivElement> = event => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length) {
      onUpload(files)
    }
  }

  const handleDragOver: DragEventHandler<HTMLDivElement> = event => {
    event.preventDefault()
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-4 text-center"
    >
      <div className="text-sm font-semibold text-brand-700">Upload documents</div>
      <p className="mt-1 text-xs text-slate-500">
        Drag files here or
        <button
          type="button"
          onClick={handleSelectFiles}
          className="ml-1 font-semibold text-brand-600 hover:text-brand-500"
        >
          browse
        </button>
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        Supports PDF and DOCX. Stored securely in your repository.
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
        onChange={handleChange}
      />
      {isUploading && <div className="mt-3 text-xs text-brand-600">Uploading...</div>}
    </div>
  )
}

export default FileUploader