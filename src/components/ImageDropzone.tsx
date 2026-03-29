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
          <strong>{hasImage ? "Bytt maze-bilde" : "Last opp maze-bilde"}</strong>
          <p>Dra inn fil eller bruk knappen.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}>
          {hasImage ? "Velg nytt" : "Velg fil"}
        </button>
      </div>
    </>
  );
}
