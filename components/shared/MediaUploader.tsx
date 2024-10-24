"use client";


/* eslint-disable @typescript-eslint/no-explicit-any */

import { useToast } from "@/hooks/use-toast";
import React, { FC, ReactElement } from "react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { getImageSize } from "@/lib/utils";
import { dataUrl } from "@/lib/utils";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";

interface MediaUploaderProps {
  onValueChange: (value: string) => void;
  setImage: React.Dispatch<any>;
  publicId: string;
  image: any;
  type: string;
}

const MediaUploader: FC<MediaUploaderProps> = ({
  onValueChange,
  setImage,
  publicId,
  image,
  type,
}): ReactElement => {
  const { toast } = useToast();

  const onUploadSuccess = (response: any): void => {
    console.log(response);
    setImage((prev: any) => ({
      ...prev,
      publicId: response?.info?.public_id,
      width: response?.info?.width,
      height: response?.info?.height,
      secureUrl: response?.info?.secure_url,
    }));

    onValueChange(response?.info?.public_id);

    toast({
      title: "Image uploaded successfully",
      description: "Image uploaded successfully",
      duration: 5000,
      className: "success-toast",
    });
  };

  const onUploadError = (error: any): void => {
    toast({
      title: "Something went wrong",
      description: error,
      duration: 5000,
      className: "error-toast",
    });
  };
  return (
    <CldUploadWidget
      uploadPreset="jsm_temptify"
      options={{
        multiple: false,
        resourceType: "image",
      }}
      onSuccess={onUploadSuccess}
      onError={onUploadError}
    >
      {({ open }) => {
        return (
          <div className="flex flex-col gap-4">
            <h3 className="h3-bold text-dark-600">Original</h3>
            {publicId ? (
              <>
                <div className="cursor-pointer overflow-hidden rounded-[10px]">
                  <CldImage
                    width={getImageSize(type, image, "width")}
                    height={getImageSize(type, image, "height")}
                    src={publicId}
                    alt="Uploaded Image"
                    sizes={"(max-width: 768px) 100vw, 50vw"}
                    placeholder={dataUrl as PlaceholderValue}
                    className="media-uploader_cldimage"
                  />
                </div>
              </>
            ) : (
              <div
                className="media-uploader_cta"
                onClick={() => {
                  open();
                }}
              >
                <div className="media-uploader_cta-image">
                  <Image
                    src={"/assets/icons/add.svg"}
                    alt="Add Image"
                    width={24}
                    height={24}
                  />
                </div>
                <p className="p-14-medium">Click here to upload image</p>
              </div>
            )}
          </div>
        );
      }}
    </CldUploadWidget>
  );
};

export default MediaUploader;
