import { useRef, type ChangeEvent, type DragEvent } from "react";

type ImageDropzoneProps = {
  hasImage: boolean;
  onFileSelect: (file: File) => void;
};

export function ImageDropzone({ hasImage, onFileSelect }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];

    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={onChange}
      />
      <div className="dropzone" onDrop={onDrop} onDragOver={onDragOver}>
        <div>
          <strong>{hasImage ? "Replace maze image" : "Upload maze image"}</strong>
          <p>Drag in a file or use the button.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}>
          {hasImage ? "Choose new file" : "Choose file"}
        </button>
      </div>
    </>
  );
}
