"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */



import { zodResolver } from "@hookform/resolvers/zod";
import React, {
  FC,
  ReactElement,
  useEffect,
  useState,
  useTransition,
} from "react";
import { z } from "zod";
import { FaSpinner } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  aspectRatioOptions,
  creditFee,
  defaultValues,
  transformationTypes,
} from "@/constants";
import { CustomField } from "./CustomField";
import { debounce, deepMergeObjects } from "@/lib/utils";
import { updateCredits } from "@/lib/actions/user.actions";
import MediaUploader from "./MediaUploader";
import TransformedImage from "./TransformedImage";
import { getCldImageUrl } from "next-cloudinary";
import { addImage, updateImage } from "@/lib/actions/image.actions";
import { useRouter } from "next/navigation";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
});

const TransformationForm: FC<TransformationFormProps> = ({
  action,
  data = null,
  userId,
  type,
  config = null,
  creditBalance,
}): ReactElement => {
  const transformationType = transformationTypes[type];
  const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [transformationConfig, setTransformationConfig] = useState(config);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();
  const [image, setImage] = useState(data);
  const [newTransormation, setNewTransformation] =
    useState<Transformations | null>(null);

  const router = useRouter();
  const onSelectedFieldHandler = (
    value: string,
    onChangeField: (value: string) => void
  ): void => {
    const imageSize =
      aspectRatioOptions[value as keyof typeof aspectRatioOptions];
    setImage((prev: any) => ({
      ...prev,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }));

    setNewTransformation(transformationType.config);

    return onChangeField(value);
  };

  const initialValues =
    data && action === "Update"
      ? {
          title: data?.title,
          aspectRatio: data?.aspectRatio,
          color: data?.color,
          prompt: data?.prompt,
          publicId: data?.publicId,
        }
      : defaultValues;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmiting(true);

    if (data || image) {
      const transormationUrl = getCldImageUrl({
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig,
      });

      const imageData = {
        _id: data?._id,
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: transformationConfig,
        secureURL: image?.secureUrl,
        transformationURL: transormationUrl,
        aspectRatio: values.aspectRatio,
        prompt: values.prompt,
        color: values.color,
      };

      if (action === "Add") {
        try {
          const newImage = await addImage({
            image: imageData,
            userId,
            path: "/",
          });

          if (newImage) {
            router.push(`/transformations/${newImage._id}`);
          }
        } catch (error) {
          console.log("TransformationForm -> error", error);
        }
      }
      if (action === "Update") {
        try {
          const updatedImage = await updateImage({
            image: {
              ...imageData,
              _id: data._id,
            },
            userId,
            path: `/transformations/${data._id}`,
          });

          if (updatedImage) {
            form.reset();
            setImage(data);
            setIsSubmiting(false);
            router.push(`/transformations/${updatedImage._id}`);
          }
        } catch (error) {
          console.log("TransformationForm -> error", error);
        }
      }
    }
    setIsSubmiting(false);
  };

  const onInputChangeHandler = (
    fieldName: string,
    value: string,
    type: string,
    onChangeField: (value: string) => void
  ): void => {
    debounce(() => {
      setNewTransformation((prev: any) => ({
        ...prev,
        [type]: {
          ...prev?.[type],
          [fieldName === "prompt" ? "prompt" : "to"]: value,
        },
      }));
    }, 1000)() // self invoking function;

    return onChangeField(value);
  };

  const onTransformHandler = async () => {
    setIsTransforming(true)

    setTransformationConfig(
      deepMergeObjects(newTransormation!, transformationConfig!)
    )

    setNewTransformation(null)

    startTransition(async () => {
      await updateCredits(userId, creditFee)
    })
  }


  useEffect(() => {
    console.log(creditBalance, )
    if (image && (type === "restore" || type === "removeBackground")) {
      setNewTransformation(transformationType.config);
    }
  }, [image, transformationType.config, type]);

  return (
    <>
      <Form {...form}>
        {creditBalance < Math.abs(creditFee) && (
          <InsufficientCreditsModal />
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CustomField
            control={form.control}
            name="title"
            formLabel="Image Title"
            render={({ field }) => <Input {...field} className="input-field" />}
          />

          {type === "fill" && (
            <CustomField
              control={form.control}
              name="aspectRatio"
              formLabel="Aspect Ratio"
              className="w-full"
              render={({ field }) => {
                return (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      onSelectedFieldHandler(value, field.onChange)
                    }
                  >
                    <SelectTrigger className="select-field">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(aspectRatioOptions).map((key) => {
                        const option =
                          aspectRatioOptions[
                            key as keyof typeof aspectRatioOptions
                          ];
                        return (
                          <SelectItem
                            key={key}
                            value={option.aspectRatio}
                            className="select-item"
                          >
                            {option.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          )}
          {(type === "remove" || type === "recolor") && (
            <div className="prompt-field">
              <CustomField
                control={form.control}
                name="prompt"
                formLabel={
                  type === "remove"
                    ? "Tell me some prompts"
                    : "What should I do?"
                }
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) =>
                      onInputChangeHandler(
                        "prompt",
                        e.target.value,
                        type,
                        field.onChange
                      )
                    }
                    className="input-field"
                  />
                )}
                className="w-full"
              />
              {type === "recolor" && (
                <CustomField
                  control={form.control}
                  name="color"
                  className="w-full"
                  formLabel="Replace Color"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) =>
                        onInputChangeHandler(
                          "color",
                          e.target.value,
                          "recolor",
                          field.onChange
                        )
                      }
                      className="input-field"
                    />
                  )}
                />
              )}
            </div>
          )}

          <div className="media-uploader-field">
            <CustomField
              control={form.control}
              name="publicId"
              className="flex size-full flex-col"
              render={({ field }) => (
                <MediaUploader
                  onValueChange={field.onChange}
                  setImage={setImage}
                  publicId={field.value}
                  image={image}
                  type={type}
                />
              )}
            />

            <TransformedImage
              image={image}
              type={type}
              title={form.getValues().title}
              isTransforming={isTransforming}
              setIsTransforming={setIsTransforming}
              transformationConfig={transformationConfig}
            />
          </div>
          <div className="flex flex-col gap-4">
            <Button
              disabled={isSubmiting || newTransormation === null}
              type="button"
              onClick={onTransformHandler}
              className="submit-button capitalize"
            >
              {isTransforming ? (
                <FaSpinner className="animate-spin" />
              ) : (
                "Apply Transformation"
              )}
            </Button>
            <Button
              disabled={isSubmiting}
              type="submit"
              className="submit-button capitalize"
            >
              {isSubmiting ? <FaSpinner className="animate-spin" /> : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default TransformationForm;
