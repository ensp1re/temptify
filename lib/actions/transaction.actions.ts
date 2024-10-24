"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { handleError } from "../utils";
import { connectToDatabase } from "../database/mongoose";
import Transaction from "../database/models/transaction.model";
import { updateCredits } from "./user.actions";

export const checkoutCredits = async (
  transaction: CheckoutTransactionParams
) => {


  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const amount: number = Number(transaction.amount) * 100;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: transaction.plan,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      plan: transaction.plan,
      credits: transaction.credits,
      buyerId: transaction.buyerId,
    },
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL!}/profile`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL!}/`,
  });


  if (session.url) {
    redirect(session.url);
  } else {
    throw new Error("Session URL is null");
  }
};

export const createTransaction = async (
  transaction: CreateTransactionParams
) => {
  try {
    await connectToDatabase();


    const newTransaction = await Transaction.create({
      ...transaction,
      buyer: transaction.buyerId,
    });

    console.log("newTransaction", newTransaction);

    await updateCredits(transaction.buyerId, transaction.credits);

    return JSON.parse(JSON.stringify(newTransaction));
  } catch (error) {
    console.log(error);
    handleError(error);
  }
};
