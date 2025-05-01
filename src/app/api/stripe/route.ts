import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const product_test = 'prod_test'; // Replace with your actual product ID if needed
const price_test = 'price_test'; // Replace with your actual price ID if needed
const successUrl = 'http://localhost:9002/?success=true';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { successUrl } = body;

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe secret key is missing.' }, { status: 500 });
      }
    
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: price_test,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: `${body.origin}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}