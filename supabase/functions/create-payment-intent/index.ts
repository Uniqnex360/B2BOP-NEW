import Stripe from 'stripe';
const stripe=new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!,{
    apiVersion:'2023-10-16'
})
Deno.serve(async(req)=>{
    const corsHeaders={
        "Access-Control-Allow-Origin":"*",
       "Access-Control-Allow-Headers": 'authorization,x-client-info,apikey,content-type',
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }
    if(req.method==='OPTIONS')
    {
        return new Response('ok',{status:200,headers:corsHeaders})
    }
    try {
        const {amount,currency}=await req.json()
        const paymentIntent=await stripe.paymentIntents.create({
            amount,currency:currency||"usd",payment_method_types:['card']
        })
        return new Response(JSON.stringify({clientSecret:paymentIntent.client_secret}),
    {
        headers:{
            ...corsHeaders,
            'Content-Type':'application/json'
        }
    })
    } catch (error) {
        return new Response(JSON.stringify({error:error.message}),{
            status:500,
            headers:{
                ...corsHeaders,'Content-Type':'application/json'
            }
        })
    }
})