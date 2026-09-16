import React from 'react';
import { DropzoneOptions, useDropzone } from 'react-dropzone';

const Dropzone: React.FC<Pick<DropzoneOptions, 'onDrop'>> = ({ onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.wav', '.mp3', '.flac'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className="flex items-center justify-center cursor-pointer h-full p-8"
    >
      <input className="" {...getInputProps()} />
      {isDragActive ? (
        <p className="dropzone-content">Release to drop the files here</p>
      ) : (
        <p className="dropzone-content">
          Drag &amp; drop some files here, or click to select files
        </p>
      )}
    </div>
  );
};

export default Dropzone;
