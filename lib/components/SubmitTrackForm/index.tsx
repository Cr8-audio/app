import React from 'react';
import FileIcon from '@/lib/components/common/FileIcon';
import DropZoneComponent from '@/lib/components/DropZone';
import { DropzoneOptions } from 'react-dropzone';

interface SubmitFormProps {
  file: File | null;
  onFileChange: (file: File) => void;
  uploadPending: boolean;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}

const SubmitFormComponent: React.FC<SubmitFormProps> = ({
  file,
  onFileChange,
  uploadPending,
  onSubmit,
}) => {
  const onDrop: DropzoneOptions['onDrop'] = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileChange(acceptedFiles[0]);
    }
  };

  return (
    <form
      encType="multipart/form-data"
      method="post"
      onSubmit={onSubmit}
      className="flex flex-col mt-8 flex-grow"
    >
      <div className="border-dashed border-2 border-gray-200 flex-grow flex flex-col justify-center">
        {file ? (
          <div className="flex justify-center">
            <div className="flex flex-col relative">
              <div className="bg-blue-200 py-4 px-2 rounded justify-center grid place-items-center">
                <FileIcon />
                <div className="mt-2 text-center">{file.name}</div>
              </div>
              <button
                type="submit"
                className="bg-green-300 px-4 py-1 rounded text-black self-center mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadPending}
              >
                Upload
              </button>
            </div>
          </div>
        ) : (
          <DropZoneComponent onDrop={onDrop} />
        )}
      </div>
    </form>
  );
};

export default SubmitFormComponent;
