import Header from "@/components/shared/Header";
import React, { FC, ReactElement } from "react";
import { transformationTypes } from "@/constants";
import TransformationForm from "@/components/shared/TransformationForm";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

interface AddTransormationTypePageProps {
  params: {
    type: SearchParamProps;
  };
}

const AddTransormationTypePage: FC<AddTransormationTypePageProps> = async ({
  params,
}): Promise<ReactElement> => {
  const transformation =
    transformationTypes[
      params.type as unknown as keyof typeof transformationTypes
    ];

  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getUserById(userId as string);

  return (
    <>
      <Header title={transformation.title} subtitle={transformation.subTitle} />
      <section className="mt-10">
        <TransformationForm
          action="Add"
          userId={user?._id}
          type={transformation.type as TransformationTypeKey}
          creditBalance={user?.creditBalance}
        />
      </section>
    </>
  );
};

export default AddTransormationTypePage;
