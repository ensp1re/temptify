import { Collection } from "@/components/shared/Collection";
import { INavLink, navLinks } from "@/constants";
import { getAllImages } from "@/lib/actions/image.actions";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Home = async ({ searchParams }: SearchParamProps) => {
  const page = Number(searchParams?.page) || 1;
  const searchQuery = (searchParams?.query as string) || "";


  const images = (await getAllImages({ page, searchQuery }))?.data || [];


  return (
    <>
      <section className="home">
        <h1 className="home-heading">Unleash Your Creativity with Temptify</h1>
        <ul className="flex-center w-full gap-20">
          {navLinks &&
            navLinks.slice(1, 5).map((link: INavLink) => {
              return (
                <Link
                  key={link.route}
                  href={link.route}
                  className="flex-center flex-col gap-2"
                >
                  <li className="bg-white p-4 rounded-full flex-center w-fit hover:bg-violet-50 transition duration-300 cursor-pointer">
                    <Image
                      src={link.icon}
                      alt={link.label}
                      width={24}
                      height={24}
                    />
                  </li>
                  <p className="p-14-medium text-center text-white">
                    {link.label}
                  </p>
                </Link>
              );
            })}
        </ul>
      </section>
      <section className="sm:mt-12">
        <Collection
          hasSearch={true}
          images={images}
          totalPages={images?.totalPage}
          page={page}
        />
      </section>
    </>
  );
};

export default Home;
